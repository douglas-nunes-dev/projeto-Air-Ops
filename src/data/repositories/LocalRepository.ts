import type { DadosLocal, LocalAtendimento } from '@/domain/cliente/local';

// Toda falha deve ser lançada como ErroDados.
export interface LocalRepository {
  listarPorCliente(clienteId: string): Promise<LocalAtendimento[]>;
  listar(organizacaoId: string): Promise<LocalAtendimento[]>;
  criar(organizacaoId: string, clienteId: string, dados: DadosLocal): Promise<LocalAtendimento>;
  atualizar(id: string, dados: DadosLocal): Promise<LocalAtendimento>;
  definirAtivo(id: string, ativo: boolean): Promise<void>;
}
