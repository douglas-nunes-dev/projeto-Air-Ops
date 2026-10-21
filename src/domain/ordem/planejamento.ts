import { addHours, addMinutes, format, isSameDay, startOfHour } from 'date-fns';
import { z } from 'zod';
import type { Ordem } from './tipos';
import { podeTransitar } from './transicoes';

// Planejamento da OS (etapa 3): agendar, reagendar e cancelar.
// Os limites são os mesmos da Edge Function (supabase/functions/alterar-status-ordem/regras.ts).

export const DURACOES = [
  { minutos: 30, rotulo: '30 minutos' },
  { minutos: 60, rotulo: '1 hora' },
  { minutos: 90, rotulo: '1h30' },
  { minutos: 120, rotulo: '2 horas' },
  { minutos: 180, rotulo: '3 horas' },
  { minutos: 240, rotulo: '4 horas' },
  { minutos: 480, rotulo: 'Dia todo (8 horas)' },
] as const;

export const AgendamentoFormularioSchema = z
  .object({
    tecnicoId: z.string().uuid('Escolha o técnico'),
    /** AAAA-MM-DD, do campo de data do navegador. */
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
    /** HH:MM, do campo de hora do navegador. */
    hora: z.string().regex(/^\d{2}:\d{2}$/, 'Informe a hora'),
    duracaoMinutos: z.coerce
      .number()
      .int()
      .min(15, 'Escolha a duração')
      .max(720, 'Use no máximo 12 horas'),
  })
  // Data e hora digitadas são do fuso de quem está usando; vira um instante em ISO 8601.
  .transform(({ tecnicoId, data, hora, duracaoMinutos }) => ({
    tecnicoId,
    agendadaPara: new Date(`${data}T${hora}:00`).toISOString(),
    duracaoMinutos,
  }));

export type AgendamentoFormulario = z.input<typeof AgendamentoFormularioSchema>;
export type DadosAgendamento = z.output<typeof AgendamentoFormularioSchema>;

export const CancelamentoFormularioSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(5, 'Escreva o motivo (pelo menos 5 caracteres)')
    .max(500, 'Use no máximo 500 caracteres'),
});

export type CancelamentoFormulario = z.input<typeof CancelamentoFormularioSchema>;

export function podeAgendar(ordem: Pick<Ordem, 'status'>): boolean {
  return podeTransitar(ordem.status, 'agendada');
}

export function podeCancelar(ordem: Pick<Ordem, 'status'>): boolean {
  return podeTransitar(ordem.status, 'cancelada');
}

/**
 * Valores iniciais do formulário: o agendamento atual, se houver; senão, a próxima hora
 * cheia de hoje (ou 8h de amanhã, se já passou das 17h).
 */
export function agendamentoParaFormulario(
  ordem: Pick<Ordem, 'tecnicoId' | 'agendadaPara' | 'duracaoMinutos'>,
  agora: Date,
): AgendamentoFormulario {
  let inicio = ordem.agendadaPara ? new Date(ordem.agendadaPara) : addHours(startOfHour(agora), 1);
  if (!ordem.agendadaPara && inicio.getHours() > 17) {
    inicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1, 8);
  }
  return {
    tecnicoId: ordem.tecnicoId ?? '',
    data: format(inicio, 'yyyy-MM-dd'),
    hora: format(inicio, 'HH:mm'),
    duracaoMinutos: ordem.duracaoMinutos,
  };
}

export function fimDoAtendimento(
  ordem: Pick<Ordem, 'agendadaPara' | 'duracaoMinutos'>,
): Date | null {
  if (!ordem.agendadaPara) return null;
  return addMinutes(new Date(ordem.agendadaPara), ordem.duracaoMinutos);
}

/** Agendada, mas o horário de início já passou sem a execução começar. */
export function estaAtrasada(ordem: Pick<Ordem, 'status' | 'agendadaPara'>, agora: Date): boolean {
  return (
    ordem.status === 'agendada' &&
    ordem.agendadaPara !== null &&
    new Date(ordem.agendadaPara) < agora
  );
}

/** Tem atendimento marcado para o mesmo dia de `agora` (e não foi cancelada). */
export function eDeHoje(ordem: Pick<Ordem, 'status' | 'agendadaPara'>, agora: Date): boolean {
  return (
    ordem.status !== 'cancelada' &&
    ordem.agendadaPara !== null &&
    isSameDay(new Date(ordem.agendadaPara), agora)
  );
}

/** OS do mesmo técnico que se sobrepõem ao horário escolhido (só um aviso; não bloqueia). */
export function conflitosDeHorario(
  ordens: Ordem[],
  {
    ordemId,
    tecnicoId,
    inicio,
    duracaoMinutos,
  }: {
    ordemId: string;
    tecnicoId: string;
    inicio: Date;
    duracaoMinutos: number;
  },
): Ordem[] {
  const fim = addMinutes(inicio, duracaoMinutos);
  return ordens.filter((outra) => {
    if (outra.id === ordemId || outra.tecnicoId !== tecnicoId) return false;
    if (outra.status === 'cancelada' || outra.status === 'concluida') return false;
    const fimOutra = fimDoAtendimento(outra);
    if (!outra.agendadaPara || !fimOutra) return false;
    return new Date(outra.agendadaPara) < fim && fimOutra > inicio;
  });
}
