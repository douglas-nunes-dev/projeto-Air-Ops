import { format } from 'date-fns';
import { PRIORIDADES, STATUS_ORDEM, type Ordem, type Prioridade, type StatusOrdem } from './tipos';
import { statusFinal } from './transicoes';

/** "em_andamento" = tudo que ainda não foi concluído nem cancelado. */
export type SituacaoFiltro = 'em_andamento' | 'todas' | StatusOrdem;

/** Filtro de técnico: um id, "sem_tecnico" ou vazio (qualquer um). */
export const SEM_TECNICO = 'sem_tecnico';

export type FiltroOrdens = {
  situacao: SituacaoFiltro;
  prioridade: Prioridade | '';
  tecnicoId: string;
  /** Data de abertura, AAAA-MM-DD; vazio = sem limite. */
  abertaDe: string;
  abertaAte: string;
};

export const FILTRO_PADRAO: FiltroOrdens = {
  situacao: 'em_andamento',
  prioridade: '',
  tecnicoId: '',
  abertaDe: '',
  abertaAte: '',
};

const SITUACOES: readonly string[] = ['em_andamento', 'todas', ...STATUS_ORDEM];
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Lê o filtro do endereço (ex.: /ordens?situacao=aberta), ignorando valores que não existem. */
export function lerFiltro(parametros: URLSearchParams): FiltroOrdens {
  const situacao = parametros.get('situacao') ?? '';
  const prioridade = parametros.get('prioridade') ?? '';
  const abertaDe = parametros.get('de') ?? '';
  const abertaAte = parametros.get('ate') ?? '';
  return {
    situacao: SITUACOES.includes(situacao) ? (situacao as SituacaoFiltro) : FILTRO_PADRAO.situacao,
    prioridade: (PRIORIDADES as readonly string[]).includes(prioridade)
      ? (prioridade as Prioridade)
      : '',
    tecnicoId: parametros.get('tecnico') ?? '',
    abertaDe: DATA.test(abertaDe) ? abertaDe : '',
    abertaAte: DATA.test(abertaAte) ? abertaAte : '',
  };
}

/** O contrário de lerFiltro: só os campos diferentes do padrão vão para o endereço. */
export function filtroParaParametros(filtro: FiltroOrdens): URLSearchParams {
  const parametros = new URLSearchParams();
  if (filtro.situacao !== FILTRO_PADRAO.situacao) parametros.set('situacao', filtro.situacao);
  if (filtro.prioridade) parametros.set('prioridade', filtro.prioridade);
  if (filtro.tecnicoId) parametros.set('tecnico', filtro.tecnicoId);
  if (filtro.abertaDe) parametros.set('de', filtro.abertaDe);
  if (filtro.abertaAte) parametros.set('ate', filtro.abertaAte);
  return parametros;
}

function passaSituacao(ordem: Ordem, situacao: SituacaoFiltro): boolean {
  if (situacao === 'todas') return true;
  if (situacao === 'em_andamento') return !statusFinal(ordem.status);
  return ordem.status === situacao;
}

function passaTecnico(ordem: Ordem, tecnicoId: string): boolean {
  if (!tecnicoId) return true;
  if (tecnicoId === SEM_TECNICO) return ordem.tecnicoId === null;
  return ordem.tecnicoId === tecnicoId;
}

function passaPeriodo(ordem: Ordem, de: string, ate: string): boolean {
  // Compara pelo dia no fuso de quem está usando, não em UTC.
  const dia = format(new Date(ordem.criadoEm), 'yyyy-MM-dd');
  if (de && dia < de) return false;
  if (ate && dia > ate) return false;
  return true;
}

export function filtrarOrdens(ordens: Ordem[], filtro: FiltroOrdens): Ordem[] {
  return ordens.filter(
    (ordem) =>
      passaSituacao(ordem, filtro.situacao) &&
      (!filtro.prioridade || ordem.prioridade === filtro.prioridade) &&
      passaTecnico(ordem, filtro.tecnicoId) &&
      passaPeriodo(ordem, filtro.abertaDe, filtro.abertaAte),
  );
}

export function filtroAtivo(filtro: FiltroOrdens): boolean {
  return filtroParaParametros(filtro).size > 0;
}
