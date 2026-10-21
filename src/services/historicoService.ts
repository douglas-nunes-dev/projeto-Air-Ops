import { historicoRepository } from '@/data';
import type { AtendimentoHistorico } from '@/domain/historico/historico';

export async function listarHistoricoDoEquipamento(
  equipamentoId: string,
): Promise<AtendimentoHistorico[]> {
  return historicoRepository.doEquipamento(equipamentoId);
}

export async function listarHistoricoDoCliente(clienteId: string): Promise<AtendimentoHistorico[]> {
  return historicoRepository.doCliente(clienteId);
}
