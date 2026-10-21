import { execucaoRepository, filaFotos, storageProvider } from '@/data';
import { ErroDados } from '@/domain/erros';
import {
  caminhoDaFoto,
  LegendaFotoSchema,
  TAMANHO_MAXIMO_FOTO,
  type FotoDaOrdem,
  type FotoPendente,
} from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { gerarId } from '@/lib/identificador';
import { reduzirFoto } from '@/lib/imagem';

// Fotos da execução (seção 11, "Arquivos" e "fila de fotos"). Toda foto passa pela fila do
// aparelho: é guardada primeiro e enviada quando houver sinal. Assim o técnico nunca perde
// uma foto por causa de sinal ruim, e não precisa esperar o envio para continuar.

/** Validade dos endereços para ver as fotos (seção 11: URLs assinadas de validade curta). */
const VALIDADE_ENDERECO_SEGUNDOS = 60 * 60;

// --- Avisos de mudança na fila (a tela mostra quantas fotos faltam enviar) ---

const ouvintes = new Set<() => void>();

export function observarFilaDeFotos(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function avisarMudanca() {
  for (const ouvinte of ouvintes) ouvinte();
}

// --- Fila ---

export async function adicionarFoto(
  ordem: Pick<Ordem, 'id' | 'organizacaoId'>,
  arquivo: Blob,
  legenda = '',
): Promise<void> {
  let reduzida: Blob;
  try {
    reduzida = await reduzirFoto(arquivo);
  } catch (erro) {
    throw new ErroDados('dados_invalidos', {
      mensagem: 'Não foi possível ler esta foto. Tente tirar de novo.',
      cause: erro,
    });
  }
  if (reduzida.size > TAMANHO_MAXIMO_FOTO) {
    throw new ErroDados('dados_invalidos', { mensagem: 'A foto é grande demais para enviar.' });
  }

  try {
    await filaFotos.guardar({
      id: gerarId(),
      organizacaoId: ordem.organizacaoId,
      ordemId: ordem.id,
      arquivo: reduzida,
      legenda: LegendaFotoSchema.parse(legenda),
      tiradaEm: new Date().toISOString(),
      erro: null,
    });
  } catch (erro) {
    // Ex.: navegação anônima ou aparelho sem espaço.
    throw new ErroDados('desconhecido', {
      mensagem: 'Não foi possível guardar a foto neste aparelho. Confira o espaço livre.',
      cause: erro,
    });
  }
  avisarMudanca();
  // Não espera: o técnico segue trabalhando enquanto a foto sobe.
  void enviarFotosPendentes();
}

export async function listarFotosPendentes(ordemId?: string): Promise<FotoPendente[]> {
  const fotos = await filaFotos.listar();
  return ordemId ? fotos.filter((foto) => foto.ordemId === ordemId) : fotos;
}

/** Tira da fila uma foto que o servidor recusou (ex.: a OS foi cancelada). */
export async function descartarFotoPendente(id: string): Promise<void> {
  await filaFotos.remover(id);
  avisarMudanca();
}

/** Apaga as fotos guardadas no aparelho (ao sair da conta). */
export async function limparFotosDoAparelho(): Promise<void> {
  await filaFotos.limpar();
  avisarMudanca();
}

async function enviarUma(foto: FotoPendente): Promise<void> {
  // Primeiro o arquivo, depois o registro: o registro nunca aponta para um arquivo que não existe.
  await storageProvider.enviar(
    caminhoDaFoto(foto.organizacaoId, foto.ordemId, foto.id),
    foto.arquivo,
  );
  await execucaoRepository.registrarFoto({
    id: foto.id,
    organizacaoId: foto.organizacaoId,
    ordemId: foto.ordemId,
    legenda: foto.legenda,
    tamanhoBytes: foto.arquivo.size,
    tiradaEm: foto.tiradaEm,
  });
}

export type ResultadoEnvio = { enviadas: number; recusadas: number };

async function enviarTodas(): Promise<ResultadoEnvio> {
  const resultado: ResultadoEnvio = { enviadas: 0, recusadas: 0 };
  for (const foto of await filaFotos.listar()) {
    // Recusada antes: espera a pessoa decidir (descartar), não insiste sozinho.
    if (foto.erro) continue;
    try {
      await enviarUma(foto);
      await filaFotos.remover(foto.id);
      resultado.enviadas += 1;
    } catch (erro) {
      // Sem sinal: para e tenta tudo de novo mais tarde, na mesma ordem.
      if (erro instanceof ErroDados && erro.motivo === 'sem_conexao') break;
      const mensagem = erro instanceof ErroDados ? erro.message : 'Falha desconhecida.';
      await filaFotos.marcarErro(foto.id, mensagem);
      resultado.recusadas += 1;
    }
    avisarMudanca();
  }
  return resultado;
}

let envioEmAndamento: Promise<ResultadoEnvio> | null = null;

/** Envia o que estiver na fila. Chamadas ao mesmo tempo esperam o mesmo envio. */
export function enviarFotosPendentes(): Promise<ResultadoEnvio> {
  envioEmAndamento ??= enviarTodas().finally(() => {
    envioEmAndamento = null;
  });
  return envioEmAndamento;
}

// --- Fotos já enviadas ---

/** Endereços temporários para ver as fotos, na mesma ordem. */
export async function enderecosDasFotos(fotos: Pick<FotoDaOrdem, 'caminho'>[]): Promise<string[]> {
  return storageProvider.enderecosTemporarios(
    fotos.map((foto) => foto.caminho),
    VALIDADE_ENDERECO_SEGUNDOS,
  );
}

export async function removerFoto(foto: Pick<FotoDaOrdem, 'id' | 'caminho'>): Promise<void> {
  // Primeiro o registro (é o que o RLS confere); se apagar o arquivo falhar depois, sobra
  // só um arquivo sem registro, que ninguém vê.
  await execucaoRepository.removerFoto(foto);
  await storageProvider.remover(foto.caminho).catch(() => undefined);
}
