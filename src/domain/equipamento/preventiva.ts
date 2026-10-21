// Preventiva simples (etapa 8): cálculo da próxima manutenção. TS puro e SEM importações: o
// mesmo arquivo roda na tela e na Edge Function que conclui a OS (Deno).
//
// Decisão da etapa 8: a próxima conta a partir da ÚLTIMA preventiva feita
// ("data da conclusão + periodicidade"). Sem preventiva registrada: instalação + periodicidade;
// sem data de instalação, já vence hoje. O gestor pode ajustar a data à mão no cadastro.

/** Datas sem horário em "AAAA-MM-DD", como o banco guarda (`date`). */
export type DataSimples = string;

export const FUSO_DA_EMPRESA = 'America/Sao_Paulo';

/** Antecedência da lista "vencendo" (seção 6: "preventivas vencendo em 30 dias"). */
export const DIAS_DE_ANTECEDENCIA = 30;

/** O dia (no fuso da empresa) de um instante; o servidor roda em UTC. */
export function diaNoFuso(instante: Date, fuso = FUSO_DA_EMPRESA): DataSimples {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

export function somarDias(data: DataSimples, dias: number): DataSimples {
  const [ano, mes, dia] = data.split('-').map(Number);
  // Meio-dia em UTC: somar dias nunca cruza a virada por causa de fuso ou horário de verão.
  const resultado = new Date(Date.UTC(ano, mes - 1, dia, 12) + dias * 86_400_000);
  return resultado.toISOString().slice(0, 10);
}

/** Dias de `de` até `ate` (negativo se `ate` já passou). */
export function diasEntre(de: DataSimples, ate: DataSimples): number {
  const utc = (data: DataSimples) => {
    const [ano, mes, dia] = data.split('-').map(Number);
    return Date.UTC(ano, mes - 1, dia);
  };
  return Math.round((utc(ate) - utc(de)) / 86_400_000);
}

/** Próxima manutenção depois de concluir uma preventiva. */
export function proximaAposConclusao(
  concluidaEm: Date,
  periodicidadeDias: number,
  fuso = FUSO_DA_EMPRESA,
): DataSimples {
  return somarDias(diaNoFuso(concluidaEm, fuso), periodicidadeDias);
}

type EquipamentoComPreventiva = {
  periodicidadeDias: number | null;
  proximaManutencao: DataSimples | null;
  dataInstalacao: DataSimples | null;
};

/**
 * Quando vence a próxima preventiva; null = equipamento sem periodicidade (não entra na lista).
 * Sem data guardada: instalação + periodicidade; sem instalação, vence hoje.
 */
export function vencimentoDaPreventiva(
  equipamento: EquipamentoComPreventiva,
  hoje: DataSimples,
): DataSimples | null {
  if (!equipamento.periodicidadeDias) return null;
  if (equipamento.proximaManutencao) return equipamento.proximaManutencao;
  if (equipamento.dataInstalacao) {
    return somarDias(equipamento.dataInstalacao, equipamento.periodicidadeDias);
  }
  return hoje;
}

export type SituacaoPreventiva =
  | { tipo: 'sem_periodicidade' }
  | { tipo: 'vencida'; dias: number; vencimento: DataSimples }
  | { tipo: 'vencendo'; dias: number; vencimento: DataSimples }
  | { tipo: 'em_dia'; dias: number; vencimento: DataSimples };

/** Vencida (já passou), vencendo (nos próximos 30 dias) ou em dia. */
export function situacaoDaPreventiva(
  equipamento: EquipamentoComPreventiva,
  hoje: DataSimples,
): SituacaoPreventiva {
  const vencimento = vencimentoDaPreventiva(equipamento, hoje);
  if (!vencimento) return { tipo: 'sem_periodicidade' };
  const dias = diasEntre(hoje, vencimento);
  if (dias < 0) return { tipo: 'vencida', dias: -dias, vencimento };
  if (dias <= DIAS_DE_ANTECEDENCIA) return { tipo: 'vencendo', dias, vencimento };
  return { tipo: 'em_dia', dias, vencimento };
}

/** "Vencida há 3 dias", "Vence hoje", "Vence em 12 dias", "Em dia (vence em 45 dias)". */
export function descreverSituacao(situacao: SituacaoPreventiva): string {
  switch (situacao.tipo) {
    case 'sem_periodicidade':
      return 'Sem periodicidade definida';
    case 'vencida':
      return situacao.dias === 1 ? 'Vencida há 1 dia' : `Vencida há ${situacao.dias} dias`;
    case 'vencendo':
      if (situacao.dias === 0) return 'Vence hoje';
      return situacao.dias === 1 ? 'Vence amanhã' : `Vence em ${situacao.dias} dias`;
    case 'em_dia':
      return `Em dia (vence em ${situacao.dias} dias)`;
  }
}
