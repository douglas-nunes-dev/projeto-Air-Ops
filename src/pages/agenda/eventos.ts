import type { EventInput } from '@fullcalendar/react';
import { estaAtrasada, fimDoAtendimento } from '@/domain/ordem/planejamento';
import { formatarNumeroOrdem, type Ordem, type StatusOrdem } from '@/domain/ordem/tipos';

// Cores dos blocos na agenda; atrasada ganha vermelho, para chamar atenção.
const CORES: Record<StatusOrdem | 'atrasada', string> = {
  aberta: '#0ea5e9',
  agendada: '#1d4ed8',
  em_execucao: '#d97706',
  pausada: '#ea580c',
  concluida: '#059669',
  cancelada: '#6b7280',
  atrasada: '#dc2626',
};

/** OS que aparecem na agenda: com horário marcado e não canceladas. */
export function ordensNaAgenda(ordens: Ordem[], tecnicoId: string): Ordem[] {
  return ordens.filter(
    (ordem) =>
      ordem.agendadaPara !== null &&
      ordem.status !== 'cancelada' &&
      (!tecnicoId || ordem.tecnicoId === tecnicoId),
  );
}

/** Converte as OS em blocos do FullCalendar. Só OS agendada pode ser arrastada. */
export function eventosDaAgenda(ordens: Ordem[], agora: Date, podeMover: boolean): EventInput[] {
  return ordens.flatMap((ordem) => {
    const fim = fimDoAtendimento(ordem);
    if (!ordem.agendadaPara || !fim) return [];
    const cor = CORES[estaAtrasada(ordem, agora) ? 'atrasada' : ordem.status];
    return [
      {
        id: ordem.id,
        title: `${formatarNumeroOrdem(ordem.numero)} · ${ordem.clienteNome}`,
        start: ordem.agendadaPara,
        end: fim.toISOString(),
        backgroundColor: cor,
        borderColor: cor,
        editable: podeMover && ordem.status === 'agendada',
        extendedProps: { tecnico: ordem.tecnicoNome ?? '', local: ordem.localNome },
      },
    ];
  });
}

/** OS que ainda esperam data e técnico: abertas e pausadas, as mais urgentes primeiro. */
export function aguardandoAgendamento(ordens: Ordem[]): Ordem[] {
  const peso = { urgente: 0, alta: 1, media: 2, baixa: 3 } as const;
  return ordens
    .filter((ordem) => ordem.status === 'aberta' || ordem.status === 'pausada')
    .sort((a, b) => peso[a.prioridade] - peso[b.prioridade] || a.numero - b.numero);
}
