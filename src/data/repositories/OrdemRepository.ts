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
}
