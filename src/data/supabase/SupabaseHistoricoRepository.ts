import type { HistoricoRepository } from '../repositories/HistoricoRepository';
import type { AtendimentoHistorico } from '@/domain/historico/historico';
import { obterClienteSupabase } from './client';
import { exigirDados } from './erros';
import type { Database } from './tipos-banco';

type LinhaHistorico =
  Database['public']['Functions']['historico_do_equipamento']['Returns'][number];

// O gerador de tipos marca as colunas de funções como sempre preenchidas, mas data de
// conclusão, agendamento, diagnóstico e técnico podem vir vazios: "?? null" deixa isso explícito.
function mapearAtendimento(linha: LinhaHistorico): AtendimentoHistorico {
  return {
    ordemId: linha.ordem_id,
    numero: linha.numero,
    localNome: linha.local_nome,
    tipoServico: linha.tipo_servico,
    status: linha.status,
    problema: linha.problema,
    tecnicoId: linha.tecnico_id ?? null,
    tecnicoNome: linha.tecnico_nome ?? null,
    agendadaPara: linha.agendada_para ?? null,
    criadoEm: linha.criado_em,
    concluidaEm: linha.concluida_em ?? null,
    diagnostico: linha.diagnostico ?? null,
    fotos: linha.fotos,
    naoConformes: linha.nao_conformes,
  };
}

export class SupabaseHistoricoRepository implements HistoricoRepository {
  async doEquipamento(equipamentoId: string): Promise<AtendimentoHistorico[]> {
    const linhas = exigirDados(
      await obterClienteSupabase().rpc('historico_do_equipamento', {
        p_equipamento_id: equipamentoId,
      }),
    );
    return linhas.map(mapearAtendimento);
  }

  async doCliente(clienteId: string): Promise<AtendimentoHistorico[]> {
    const linhas = exigirDados(
      await obterClienteSupabase().rpc('historico_do_cliente', { p_cliente_id: clienteId }),
    );
    return linhas.map(mapearAtendimento);
  }
}
