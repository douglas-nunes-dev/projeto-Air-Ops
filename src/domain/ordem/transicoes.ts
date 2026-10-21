import type { StatusOrdem } from './tipos';

// Fluxo da OS (seção 4 do projeto.md). TS puro: o mesmo código roda na tela,
// na Edge Function de mudança de status (etapa 3) e, no futuro, na API Node.
const TRANSICOES: Record<StatusOrdem, readonly StatusOrdem[]> = {
  aberta: ['agendada', 'cancelada'],
  // agendada → agendada é o reagendamento.
  agendada: ['em_execucao', 'agendada', 'cancelada'],
  em_execucao: ['pausada', 'concluida', 'cancelada'],
  pausada: ['em_execucao', 'agendada', 'cancelada'],
  concluida: [],
  cancelada: [],
};

export function podeTransitar(de: StatusOrdem, para: StatusOrdem): boolean {
  return TRANSICOES[de].includes(para);
}

export function proximosStatus(de: StatusOrdem): readonly StatusOrdem[] {
  return TRANSICOES[de];
}

/** Concluída e cancelada não mudam mais. */
export function statusFinal(status: StatusOrdem): boolean {
  return TRANSICOES[status].length === 0;
}

// Mesma regra do RLS: depois de terminada, a OS vira registro e não se edita mais.
export function podeEditarAbertura(status: StatusOrdem): boolean {
  return !statusFinal(status);
}
