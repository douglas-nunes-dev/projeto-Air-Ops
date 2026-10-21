import { format } from 'date-fns';
import { formatarDuracao, ROTULOS_RESPOSTA, tempoTrabalhado, type Execucao } from './execucao';
import { formatarNumeroOrdem, ROTULOS_TIPO_SERVICO, type EventoOrdem, type Ordem } from './tipos';

// Conteúdo do relatório em PDF (etapa 5), já em texto pronto para imprimir.
// Decisão da etapa 5: mostra tempo trabalhado, checklist completo e materiais; sem fotos.
// Fica separado do desenho do PDF para dar para testar sem gerar o arquivo.

export type DadosRelatorio = {
  empresa: string;
  /** "OS 42" */
  numero: string;
  tipoServico: string;
  cliente: string;
  local: string;
  endereco: string | null;
  solicitante: string | null;
  equipamentos: string[];
  problema: string;
  tecnico: string | null;
  /** "22/10/2026 10:05" */
  inicio: string | null;
  fim: string | null;
  tempoTrabalhado: string;
  checklist: { item: string; resposta: string; observacao: string | null }[];
  diagnostico: string | null;
  atividades: string[];
  materiais: string | null;
  assinatura:
    | { tipo: 'assinada'; nome: string; data: string; imagem: string | null }
    | { tipo: 'sem_assinatura'; motivo: string; data: string }
    | null;
  geradoEm: string;
};

const DATA_HORA = 'dd/MM/yyyy HH:mm';

function dataHora(iso: string | null | undefined): string | null {
  return iso ? format(new Date(iso), DATA_HORA) : null;
}

type Entrada = {
  empresa: string;
  ordem: Ordem;
  execucao: Execucao;
  eventos: EventoOrdem[];
  endereco: string | null;
  /** Imagem da assinatura em "data URL" (o PDF não busca arquivos protegidos sozinho). */
  imagemAssinatura: string | null;
  agora: Date;
};

export function montarRelatorio({
  empresa,
  ordem,
  execucao,
  eventos,
  endereco,
  imagemAssinatura,
  agora,
}: Entrada): DadosRelatorio {
  const emOrdem = [...eventos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const inicio = emOrdem.find((evento) => evento.statusNovo === 'em_execucao');
  const conclusao = emOrdem.find((evento) => evento.statusNovo === 'concluida');
  const { assinatura } = execucao;

  return {
    empresa,
    numero: formatarNumeroOrdem(ordem.numero),
    tipoServico: ROTULOS_TIPO_SERVICO[ordem.tipoServico],
    cliente: ordem.clienteNome,
    local: ordem.localNome,
    endereco,
    solicitante: ordem.solicitante,
    equipamentos: ordem.equipamentos.map((equipamento) => equipamento.identificacao),
    problema: ordem.problema,
    tecnico: ordem.tecnicoNome,
    inicio: dataHora(inicio?.criadoEm),
    fim: dataHora(conclusao?.criadoEm),
    tempoTrabalhado: formatarDuracao(tempoTrabalhado(eventos, agora)),
    checklist: execucao.checklist.map((item) => ({
      item: item.item,
      resposta: item.resposta ? ROTULOS_RESPOSTA[item.resposta] : 'Sem resposta',
      observacao: item.observacao,
    })),
    diagnostico: execucao.anotacoes.diagnostico,
    atividades: execucao.atividades.map((atividade) => atividade.descricao),
    materiais: execucao.anotacoes.materiais,
    assinatura: !assinatura
      ? null
      : assinatura.motivoSemAssinatura
        ? {
            tipo: 'sem_assinatura',
            motivo: assinatura.motivoSemAssinatura,
            data: format(new Date(assinatura.criadoEm), DATA_HORA),
          }
        : {
            tipo: 'assinada',
            nome: assinatura.nomeAssinante ?? '',
            data: format(new Date(assinatura.criadoEm), DATA_HORA),
            imagem: imagemAssinatura,
          },
    geradoEm: format(agora, DATA_HORA),
  };
}

/** Nome do arquivo: "OS-42-Hospital-Sao-Lucas.pdf" (sem acentos nem espaços). */
export function nomeArquivoRelatorio(ordem: Pick<Ordem, 'numero' | 'clienteNome'>): string {
  const cliente = ordem.clienteNome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `OS-${ordem.numero}-${cliente}.pdf`;
}
