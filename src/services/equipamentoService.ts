import { equipamentoRepository } from '@/data';
import type { FiltroEquipamentos } from '@/data/repositories/EquipamentoRepository';
import {
  EquipamentoFormularioSchema,
  type Equipamento,
  type EquipamentoFormulario,
} from '@/domain/equipamento/tipos';

export type { FiltroEquipamentos };

export async function listarEquipamentos(
  organizacaoId: string,
  filtro: FiltroEquipamentos = {},
): Promise<Equipamento[]> {
  return equipamentoRepository.listar(organizacaoId, filtro);
}

export async function buscarEquipamento(id: string): Promise<Equipamento | null> {
  return equipamentoRepository.buscarPorId(id);
}

export async function criarEquipamento(
  organizacaoId: string,
  formulario: EquipamentoFormulario,
): Promise<Equipamento> {
  return equipamentoRepository.criar(organizacaoId, EquipamentoFormularioSchema.parse(formulario));
}

export async function atualizarEquipamento(
  id: string,
  formulario: EquipamentoFormulario,
): Promise<Equipamento> {
  return equipamentoRepository.atualizar(id, EquipamentoFormularioSchema.parse(formulario));
}

export async function arquivarEquipamento(id: string): Promise<void> {
  await equipamentoRepository.definirAtivo(id, false);
}

export async function reativarEquipamento(id: string): Promise<void> {
  await equipamentoRepository.definirAtivo(id, true);
}
