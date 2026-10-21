import type { DadosEquipamento, Equipamento } from '@/domain/equipamento/tipos';

export type FiltroEquipamentos = {
  clienteId?: string;
  localId?: string;
};

// Toda falha deve ser lançada como ErroDados.
export interface EquipamentoRepository {
  listar(organizacaoId: string, filtro?: FiltroEquipamentos): Promise<Equipamento[]>;
  buscarPorId(id: string): Promise<Equipamento | null>;
  criar(organizacaoId: string, dados: DadosEquipamento): Promise<Equipamento>;
  atualizar(id: string, dados: DadosEquipamento): Promise<Equipamento>;
  definirAtivo(id: string, ativo: boolean): Promise<void>;
}
