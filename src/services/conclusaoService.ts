import { execucaoRepository, localRepository, ordemRepository, storageProvider } from '@/data';
import { resumirEndereco } from '@/domain/cliente/local';
import { ErroDados } from '@/domain/erros';
import { MENSAGENS_PENDENCIA, pendenciasParaConcluir } from '@/domain/ordem/conclusao';
import {
  ConclusaoFormularioSchema,
  type ConclusaoFormulario,
} from '@/domain/ordem/conclusaoFormulario';
import { caminhoDaFoto, podeConcluir, type Execucao } from '@/domain/ordem/execucao';
import { montarRelatorio, type DadosRelatorio } from '@/domain/ordem/relatorio';
import type { Ordem } from '@/domain/ordem/tipos';
import type { Papel } from '@/domain/organizacao/tipos';
import { blobParaDataUrl } from '@/lib/arquivo';
import { gerarId } from '@/lib/identificador';

// Conclusão da OS e relatório (etapa 5). As checagens daqui dão retorno rápido na tela;
// quem garante de verdade é a Edge Function "alterar-status-ordem".

type QuemUsa = { usuarioId: string; papeis: Papel[] };

type PedidoConclusao = {
  ordem: Ordem;
  quem: QuemUsa;
  execucao: Execucao;
  /** Fotos ainda na fila do aparelho: precisam subir antes (depois a OS não aceita mais). */
  fotosNaFila: number;
  formulario: ConclusaoFormulario;
  /** Imagem da assinatura (JPEG); null quando o cliente não assinou. */
  imagemAssinatura: Blob | null;
};

export async function concluirAtendimento({
  ordem,
  quem,
  execucao,
  fotosNaFila,
  formulario,
  imagemAssinatura,
}: PedidoConclusao): Promise<void> {
  if (!podeConcluir(ordem, quem)) {
    throw new ErroDados('dados_invalidos', {
      mensagem: 'Só o técnico da OS conclui, com o atendimento em andamento.',
    });
  }
  const pendencias = pendenciasParaConcluir({
    diagnostico: execucao.anotacoes.diagnostico,
    fotosEnviadas: execucao.fotos.length,
    fotosNaFila,
  });
  if (pendencias.length > 0) {
    throw new ErroDados('dados_invalidos', {
      mensagem: pendencias.map((pendencia) => MENSAGENS_PENDENCIA[pendencia]).join(' '),
    });
  }

  const dados = ConclusaoFormularioSchema.parse(formulario);
  if (dados.motivoSemAssinatura !== undefined) {
    await ordemRepository.concluir(ordem.id, { motivoSemAssinatura: dados.motivoSemAssinatura });
    return;
  }
  if (!imagemAssinatura) {
    throw new ErroDados('dados_invalidos', { mensagem: 'Peça para o cliente assinar no quadro.' });
  }
  // A imagem vai primeiro; a conclusão confere no servidor que ela chegou.
  const caminhoAssinatura = caminhoDaFoto(ordem.organizacaoId, ordem.id, gerarId());
  await storageProvider.enviar(caminhoAssinatura, imagemAssinatura);
  await ordemRepository.concluir(ordem.id, {
    nomeAssinante: dados.nomeAssinante,
    caminhoAssinatura,
  });
}

async function imagemDaAssinatura(caminho: string | null | undefined): Promise<string | null> {
  if (!caminho) return null;
  try {
    const [endereco] = await storageProvider.enderecosTemporarios([caminho], 300);
    const resposta = await fetch(endereco);
    if (!resposta.ok) return null;
    return await blobParaDataUrl(await resposta.blob());
  } catch {
    // Sem a imagem, o relatório sai mesmo assim, com o nome de quem assinou.
    return null;
  }
}

/** Junta tudo o que o relatório em PDF mostra. */
export async function prepararRelatorio(ordem: Ordem, empresa: string): Promise<DadosRelatorio> {
  const [execucao, eventos, locais] = await Promise.all([
    execucaoRepository.buscar(ordem.id),
    ordemRepository.listarEventos(ordem.id),
    localRepository.listarPorCliente(ordem.clienteId),
  ]);
  const local = locais.find((item) => item.id === ordem.localId);

  return montarRelatorio({
    empresa,
    ordem,
    execucao,
    eventos,
    endereco: local ? resumirEndereco(local) || null : null,
    imagemAssinatura: await imagemDaAssinatura(execucao.assinatura?.caminho),
    agora: new Date(),
  });
}
