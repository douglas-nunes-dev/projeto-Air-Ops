import { subMonths } from 'date-fns';
import type { StatusOrdem, TipoServico } from '@/domain/ordem/tipos';
import type { Papel } from '@/domain/organizacao/tipos';

// Histórico de atendimentos (etapa 6): linha do tempo por equipamento e por cliente.

/** Resumo de uma OS na linha do tempo. */
export type AtendimentoHistorico = {
  ordemId: string;
  numero: number;
  localNome: string;
  tipoServico: TipoServico;
  status: StatusOrdem;
  problema: string;
  tecnicoId: string | null;
  tecnicoNome: string | null;
  /** ISO 8601 */
  agendadaPara: string | null;
  criadoEm: string;
  concluidaEm: string | null;
  diagnostico: string | null;
  fotos: number;
  naoConformes: number;
};

/** A data que representa o atendimento: conclusão, senão o agendamento, senão a abertura. */
export function dataDoAtendimento(atendimento: AtendimentoHistorico): string {
  return atendimento.concluidaEm ?? atendimento.agendadaPara ?? atendimento.criadoEm;
}

export type ResumoHistorico = {
  /** Atendimentos que não foram cancelados. */
  total: number;
  ultimoConcluido: AtendimentoHistorico | null;
  /** Muitas corretivas em pouco tempo indicam um aparelho problemático. */
  corretivasUltimos12Meses: number;
};

export function resumirHistorico(
  atendimentos: AtendimentoHistorico[],
  agora: Date,
): ResumoHistorico {
  const validos = atendimentos.filter((atendimento) => atendimento.status !== 'cancelada');
  const concluidos = validos
    .filter((atendimento) => atendimento.concluidaEm !== null)
    .sort((a, b) => (b.concluidaEm ?? '').localeCompare(a.concluidaEm ?? ''));
  const umAnoAtras = subMonths(agora, 12);

  return {
    total: validos.length,
    ultimoConcluido: concluidos[0] ?? null,
    corretivasUltimos12Meses: validos.filter(
      (atendimento) =>
        atendimento.tipoServico === 'corretiva' &&
        new Date(dataDoAtendimento(atendimento)) >= umAnoAtras,
    ).length,
  };
}

/**
 * Dá para abrir a OS a partir do histórico? Admin e gestor, sempre; técnico, só as dele —
 * as dos outros aparecem só em resumo (decisão da etapa 6; o RLS também barra).
 */
export function podeAbrirOrdemDoHistorico(
  atendimento: Pick<AtendimentoHistorico, 'tecnicoId'>,
  quem: { usuarioId: string; papeis: Papel[] },
): boolean {
  if (quem.papeis.includes('admin') || quem.papeis.includes('gestor')) return true;
  return atendimento.tecnicoId === quem.usuarioId;
}
