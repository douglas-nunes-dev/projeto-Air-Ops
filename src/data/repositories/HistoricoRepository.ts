import type { AtendimentoHistorico } from '@/domain/historico/historico';

// Linha do tempo de atendimentos (etapa 6), da mais recente para a mais antiga.
// Toda falha deve ser lançada como ErroDados.
export interface HistoricoRepository {
  /** Todos os atendimentos do equipamento, em resumo, para qualquer membro da empresa. */
  doEquipamento(equipamentoId: string): Promise<AtendimentoHistorico[]>;
  /** Atendimentos do cliente que a pessoa pode ver (técnico: só os dele). */
  doCliente(clienteId: string): Promise<AtendimentoHistorico[]>;
}
