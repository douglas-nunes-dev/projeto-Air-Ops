import type { OrdemFormulario, Ordem } from '@/domain/ordem/tipos';
import { statusFinal } from '@/domain/ordem/transicoes';
import { situacaoDaPreventiva, type DataSimples, type SituacaoPreventiva } from './preventiva';
import type { Equipamento } from './tipos';

// Lista "Preventivas vencendo" (etapa 8) e as OS geradas a partir dela.

export type PreventivaPendente = {
  equipamento: Equipamento;
  situacao: Extract<SituacaoPreventiva, { tipo: 'vencida' | 'vencendo' }>;
  /** Preventiva já aberta (e não encerrada) com este equipamento: não gera outra. */
  ordemAberta: Pick<Ordem, 'id' | 'numero'> | null;
};

function ordemPreventivaAberta(equipamentoId: string, ordens: Ordem[]) {
  return (
    ordens.find(
      (ordem) =>
        ordem.tipoServico === 'preventiva' &&
        !statusFinal(ordem.status) &&
        ordem.equipamentos.some((equipamento) => equipamento.id === equipamentoId),
    ) ?? null
  );
}

/** Equipamentos ativos com preventiva vencida ou vencendo, do vencimento mais antigo ao mais novo. */
export function listarPreventivasPendentes(
  equipamentos: Equipamento[],
  ordens: Ordem[],
  hoje: DataSimples,
): PreventivaPendente[] {
  const pendentes: PreventivaPendente[] = [];
  for (const equipamento of equipamentos) {
    if (!equipamento.ativo) continue;
    const situacao = situacaoDaPreventiva(equipamento, hoje);
    if (situacao.tipo !== 'vencida' && situacao.tipo !== 'vencendo') continue;
    const ordem = ordemPreventivaAberta(equipamento.id, ordens);
    pendentes.push({
      equipamento,
      situacao,
      ordemAberta: ordem && { id: ordem.id, numero: ordem.numero },
    });
  }
  return pendentes.sort((a, b) => a.situacao.vencimento.localeCompare(b.situacao.vencimento));
}

export type GrupoPorLocal = {
  clienteId: string;
  clienteNome: string;
  localId: string;
  localNome: string;
  itens: PreventivaPendente[];
};

/** Decisão da etapa 8: uma OS por local, cobrindo todos os equipamentos marcados dele. */
export function agruparPorLocal(pendentes: PreventivaPendente[]): GrupoPorLocal[] {
  const grupos = new Map<string, GrupoPorLocal>();
  for (const pendente of pendentes) {
    const { equipamento } = pendente;
    const grupo = grupos.get(equipamento.localId) ?? {
      clienteId: equipamento.clienteId,
      clienteNome: equipamento.clienteNome,
      localId: equipamento.localId,
      localNome: equipamento.localNome,
      itens: [],
    };
    grupo.itens.push(pendente);
    grupos.set(equipamento.localId, grupo);
  }
  return [...grupos.values()].sort(
    (a, b) =>
      a.clienteNome.localeCompare(b.clienteNome, 'pt-BR') ||
      a.localNome.localeCompare(b.localNome, 'pt-BR'),
  );
}

const TAMANHO_MAXIMO_PROBLEMA = 2000;

/** Formulário da OS de preventiva de um local (passa pelas mesmas validações da abertura manual). */
export function ordemPreventivaDoLocal(grupo: GrupoPorLocal): OrdemFormulario {
  const nomes = grupo.itens.map((item) => item.equipamento.identificacao).join(', ');
  const problema = `Manutenção preventiva programada: ${nomes}.`;
  return {
    clienteId: grupo.clienteId,
    localId: grupo.localId,
    tipoServico: 'preventiva',
    // Vencida sobe a prioridade: já está fora do prazo combinado com o cliente.
    prioridade: grupo.itens.some((item) => item.situacao.tipo === 'vencida') ? 'alta' : 'media',
    problema:
      problema.length > TAMANHO_MAXIMO_PROBLEMA
        ? `${problema.slice(0, TAMANHO_MAXIMO_PROBLEMA - 1)}…`
        : problema,
    solicitante: '',
    equipamentoIds: grupo.itens.map((item) => item.equipamento.id),
  };
}
