// O que falta para concluir a OS (decisões da etapa 5). TS puro e SEM importações: o mesmo
// arquivo roda na tela (para mostrar o que falta) e na Edge Function (que garante a regra).

export const NOME_ASSINANTE_MINIMO = 2;
export const NOME_ASSINANTE_MAXIMO = 120;
export const MOTIVO_SEM_ASSINATURA_MINIMO = 5;
export const MOTIVO_SEM_ASSINATURA_MAXIMO = 300;

export type SituacaoParaConcluir = {
  diagnostico: string | null;
  /** Fotos já enviadas e registradas. */
  fotosEnviadas: number;
  /** Fotos ainda na fila do aparelho (só a tela sabe; no servidor é sempre 0). */
  fotosNaFila: number;
};

export type Pendencia = 'diagnostico' | 'foto' | 'fotos_na_fila';

export const MENSAGENS_PENDENCIA: Record<Pendencia, string> = {
  diagnostico: 'Preencha o diagnóstico.',
  foto: 'Envie pelo menos uma foto.',
  // Depois de concluída, a OS não aceita mais fotos: as da fila seriam perdidas.
  fotos_na_fila: 'Aguarde as fotos terminarem de enviar.',
};

export function pendenciasParaConcluir(situacao: SituacaoParaConcluir): Pendencia[] {
  const pendencias: Pendencia[] = [];
  if (!situacao.diagnostico?.trim()) pendencias.push('diagnostico');
  if (situacao.fotosEnviadas === 0) pendencias.push('foto');
  if (situacao.fotosNaFila > 0) pendencias.push('fotos_na_fila');
  return pendencias;
}

/** Frase do histórico (e do relatório) sobre quem assinou. */
export function descreverConclusao(
  assinatura: { nomeAssinante: string } | { motivoSemAssinatura: string },
): string {
  return 'nomeAssinante' in assinatura
    ? `Concluída. Assinada por ${assinatura.nomeAssinante}`
    : `Concluída sem assinatura. Motivo: ${assinatura.motivoSemAssinatura}`;
}
