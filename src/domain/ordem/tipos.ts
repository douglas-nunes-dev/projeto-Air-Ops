import { z } from 'zod';
import { textoObrigatorio, textoOpcional } from '@/domain/comum/campos';

export const STATUS_ORDEM = [
  'aberta',
  'agendada',
  'em_execucao',
  'pausada',
  'concluida',
  'cancelada',
] as const;

export type StatusOrdem = (typeof STATUS_ORDEM)[number];

export const ROTULOS_STATUS: Record<StatusOrdem, string> = {
  aberta: 'Aberta',
  agendada: 'Agendada',
  em_execucao: 'Em execução',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'] as const;

export type Prioridade = (typeof PRIORIDADES)[number];

export const ROTULOS_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const TIPOS_SERVICO = ['corretiva', 'preventiva', 'instalacao', 'outro'] as const;

export type TipoServico = (typeof TIPOS_SERVICO)[number];

export const ROTULOS_TIPO_SERVICO: Record<TipoServico, string> = {
  corretiva: 'Corretiva',
  preventiva: 'Preventiva',
  instalacao: 'Instalação',
  outro: 'Outro',
};

export type EquipamentoDaOrdem = {
  id: string;
  identificacao: string;
};

export type Ordem = {
  id: string;
  organizacaoId: string;
  /** Número que as pessoas usam ("OS 42"), sequencial dentro da empresa. */
  numero: number;
  clienteId: string;
  clienteNome: string;
  localId: string;
  localNome: string;
  tipoServico: TipoServico;
  prioridade: Prioridade;
  problema: string;
  solicitante: string | null;
  status: StatusOrdem;
  tecnicoId: string | null;
  tecnicoNome: string | null;
  /** Data e hora em ISO 8601 (preenchida no planejamento, etapa 3). */
  agendadaPara: string | null;
  abertaPorNome: string | null;
  /** Data e hora da abertura, em ISO 8601. */
  criadoEm: string;
  equipamentos: EquipamentoDaOrdem[];
};

export type TipoEventoOrdem = 'abertura' | 'edicao' | 'mudanca_status' | 'atribuicao';

/** Uma linha do histórico da OS. */
export type EventoOrdem = {
  id: string;
  tipo: TipoEventoOrdem;
  statusAnterior: StatusOrdem | null;
  statusNovo: StatusOrdem | null;
  descricao: string | null;
  usuarioNome: string | null;
  /** ISO 8601 */
  criadoEm: string;
};

export const OrdemFormularioSchema = z.object({
  clienteId: z.string().uuid('Escolha o cliente'),
  localId: z.string().uuid('Escolha o local'),
  tipoServico: z.enum(TIPOS_SERVICO, { errorMap: () => ({ message: 'Escolha o tipo' }) }),
  prioridade: z.enum(PRIORIDADES, { errorMap: () => ({ message: 'Escolha a prioridade' }) }),
  problema: textoObrigatorio('o problema relatado', 3, 2000),
  solicitante: textoOpcional(120),
  // Sem repetição: o banco recusaria o mesmo equipamento duas vezes na OS.
  equipamentoIds: z.array(z.string().uuid()).transform((ids) => [...new Set(ids)]),
});

export type OrdemFormulario = z.input<typeof OrdemFormularioSchema>;
export type DadosOrdem = z.output<typeof OrdemFormularioSchema>;

export const ORDEM_FORMULARIO_VAZIO: OrdemFormulario = {
  clienteId: '',
  localId: '',
  tipoServico: 'corretiva',
  prioridade: 'media',
  problema: '',
  solicitante: '',
  equipamentoIds: [],
};

export function ordemParaFormulario(ordem: Ordem): OrdemFormulario {
  return {
    clienteId: ordem.clienteId,
    localId: ordem.localId,
    tipoServico: ordem.tipoServico,
    prioridade: ordem.prioridade,
    problema: ordem.problema,
    solicitante: ordem.solicitante ?? '',
    equipamentoIds: ordem.equipamentos.map((equipamento) => equipamento.id),
  };
}

export function formatarNumeroOrdem(numero: number): string {
  return `OS ${numero}`;
}

/** Frase curta para a linha do histórico. */
export function descreverEvento(evento: EventoOrdem): string {
  switch (evento.tipo) {
    case 'abertura':
      return 'OS aberta';
    case 'edicao':
      return evento.descricao ?? 'OS editada';
    case 'atribuicao':
      return evento.descricao ?? 'Técnico atribuído';
    case 'mudanca_status': {
      const de = evento.statusAnterior ? ROTULOS_STATUS[evento.statusAnterior] : '—';
      const para = evento.statusNovo ? ROTULOS_STATUS[evento.statusNovo] : '—';
      return `Status: ${de} → ${para}`;
    }
  }
}
