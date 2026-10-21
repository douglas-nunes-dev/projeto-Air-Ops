import { isSameDay } from 'date-fns';
import { eDeHoje, estaAtrasada } from '@/domain/ordem/planejamento';
import type { Ordem } from '@/domain/ordem/tipos';
import { statusFinal } from '@/domain/ordem/transicoes';

// Separação das OS do técnico para as telas "Hoje" e "Minhas OS".

function porHorario(a: Ordem, b: Ordem): number {
  return (a.agendadaPara ?? '').localeCompare(b.agendadaPara ?? '');
}

/** Só as atribuídas a quem está usando (no modo autônomo, o admin também vê as dos outros). */
export function ordensDoTecnico(ordens: Ordem[], usuarioId: string): Ordem[] {
  return ordens.filter((ordem) => ordem.tecnicoId === usuarioId);
}

export function separarDoDia(ordens: Ordem[], agora: Date) {
  return {
    emAndamento: ordens
      .filter((ordem) => ordem.status === 'em_execucao' || ordem.status === 'pausada')
      .sort(porHorario),
    // Agendadas de dias anteriores que ninguém iniciou.
    atrasadas: ordens
      .filter(
        (ordem) =>
          estaAtrasada(ordem, agora) && !isSameDay(new Date(ordem.agendadaPara ?? 0), agora),
      )
      .sort(porHorario),
    hoje: ordens
      .filter((ordem) => ordem.status === 'agendada' && eDeHoje(ordem, agora))
      .sort(porHorario),
  };
}

export function separarAbertas(ordens: Ordem[]) {
  const abertas = ordens.filter((ordem) => !statusFinal(ordem.status));
  return {
    emAndamento: abertas
      .filter((ordem) => ordem.status === 'em_execucao' || ordem.status === 'pausada')
      .sort(porHorario),
    agendadas: abertas.filter((ordem) => ordem.status === 'agendada').sort(porHorario),
  };
}
