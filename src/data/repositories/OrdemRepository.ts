import type { DadosAgendamento } from '@/domain/ordem/planejamento';
import type { DadosOrdem, EventoOrdem, Ordem } from '@/domain/ordem/tipos';

// Toda falha deve ser lançada como ErroDados.
export interface OrdemRepository {
  /** Técnico recebe só as OS atribuídas a ele (RLS). */
  listar(organizacaoId: string): Promise<Ordem[]>;
  buscarPorId(id: string): Promise<Ordem | null>;
  /** Grava a OS e os equipamentos juntos: ou tudo, ou nada. */
  abrir(organizacaoId: string, dados: DadosOrdem): Promise<Ordem>;
  editar(id: string, dados: DadosOrdem): Promise<Ordem>;
  listarEventos(ordemId: string): Promise<EventoOrdem[]>;
  /** Agenda ou reagenda. Passa pelo servidor, que confere papel e transição (seção 11). */
  agendar(id: string, dados: DadosAgendamento): Promise<void>;
  cancelar(id: string, motivo: string): Promise<void>;
  /** Inicia (de agendada) ou retoma (de pausada). Só o técnico da OS (Edge Function). */
  iniciar(id: string): Promise<void>;
  pausar(id: string, motivo: string): Promise<void>;
}
