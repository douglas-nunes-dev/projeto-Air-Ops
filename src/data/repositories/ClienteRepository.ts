import type { Cliente, DadosCliente } from '@/domain/cliente/tipos';

// Toda falha deve ser lançada como ErroDados.
export interface ClienteRepository {
  listar(organizacaoId: string): Promise<Cliente[]>;
  buscarPorId(id: string): Promise<Cliente | null>;
  criar(organizacaoId: string, dados: DadosCliente): Promise<Cliente>;
  atualizar(id: string, dados: DadosCliente): Promise<Cliente>;
  definirAtivo(id: string, ativo: boolean): Promise<void>;
}
