import { z } from 'zod';
import { textoObrigatorio, textoOpcional } from '@/domain/comum/campos';
import type { Papel } from '@/domain/organizacao/tipos';
import type { EventoOrdem, Ordem } from './tipos';
import { podeTransitar } from './transicoes';

// Execução da OS no celular (etapa 4). Os limites são os mesmos do banco
// (supabase/migrations/20261022120000_execucao.sql) e da Edge Function.

// ---------------------------------------------------------------------------
// Quem registra: só o técnico atribuído (decisão da etapa 4). Aqui serve para mostrar ou
// esconder botões; quem garante de verdade são o RLS e a Edge Function (seção 11).
// ---------------------------------------------------------------------------

type QuemUsa = { usuarioId: string; papeis: Papel[] };

export function eTecnicoDaOrdem(ordem: Pick<Ordem, 'tecnicoId'>, quem: QuemUsa): boolean {
  return quem.papeis.includes('tecnico') && ordem.tecnicoId === quem.usuarioId;
}

/** Iniciar (de agendada) ou retomar (de pausada). */
export function podeIniciar(ordem: Pick<Ordem, 'status' | 'tecnicoId'>, quem: QuemUsa): boolean {
  return eTecnicoDaOrdem(ordem, quem) && podeTransitar(ordem.status, 'em_execucao');
}

export function podePausar(ordem: Pick<Ordem, 'status' | 'tecnicoId'>, quem: QuemUsa): boolean {
  return eTecnicoDaOrdem(ordem, quem) && podeTransitar(ordem.status, 'pausada');
}

/** Checklist, diagnóstico, atividades e materiais: só com a OS em execução. */
export function podeRegistrarExecucao(
  ordem: Pick<Ordem, 'status' | 'tecnicoId'>,
  quem: QuemUsa,
): boolean {
  return eTecnicoDaOrdem(ordem, quem) && ordem.status === 'em_execucao';
}

/** Fotos também com a OS pausada (a fila do celular pode terminar de enviar depois). */
export function podeEnviarFotos(
  ordem: Pick<Ordem, 'status' | 'tecnicoId'>,
  quem: QuemUsa,
): boolean {
  return (
    eTecnicoDaOrdem(ordem, quem) && (ordem.status === 'em_execucao' || ordem.status === 'pausada')
  );
}

/** A OS já passou pela execução (tem algo para mostrar no acompanhamento). */
export function execucaoComecou(ordem: Pick<Ordem, 'status'>): boolean {
  return (
    ordem.status === 'em_execucao' || ordem.status === 'pausada' || ordem.status === 'concluida'
  );
}

// ---------------------------------------------------------------------------
// Tempo trabalhado: soma dos trechos em execução, a partir dos eventos de status.
// Nada é digitado: o técnico só toca em Iniciar, Pausar e Retomar.
// ---------------------------------------------------------------------------

/** Milissegundos em execução. Se a OS ainda está em execução, conta até `agora`. */
export function tempoTrabalhado(eventos: EventoOrdem[], agora: Date): number {
  const emOrdem = [...eventos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  let total = 0;
  let inicioDoTrecho: number | null = null;

  for (const evento of emOrdem) {
    if (evento.tipo !== 'mudanca_status') continue;
    const momento = new Date(evento.criadoEm).getTime();
    if (evento.statusNovo === 'em_execucao' && inicioDoTrecho === null) {
      inicioDoTrecho = momento;
    } else if (evento.statusAnterior === 'em_execucao' && inicioDoTrecho !== null) {
      total += momento - inicioDoTrecho;
      inicioDoTrecho = null;
    }
  }
  if (inicioDoTrecho !== null) total += Math.max(0, agora.getTime() - inicioDoTrecho);
  return total;
}

/** "45min", "1h", "2h 05min". */
export function formatarDuracao(milissegundos: number): string {
  const minutos = Math.floor(milissegundos / 60_000);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h ${String(resto).padStart(2, '0')}min`;
}

// ---------------------------------------------------------------------------
// Pausa
// ---------------------------------------------------------------------------

export const MOTIVOS_PAUSA = [
  'Aguardando peça',
  'Aguardando aprovação do cliente',
  'Local indisponível no momento',
  'Fim do expediente',
] as const;

const PREFIXO_PAUSA = 'Pausada: ';

/** Motivo da pausa atual, tirado do último evento que pausou a OS. */
export function motivoDaPausa(eventos: EventoOrdem[]): string | null {
  const pausas = eventos
    .filter((evento) => evento.statusNovo === 'pausada')
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const descricao = pausas[0]?.descricao;
  if (!descricao) return null;
  return descricao.startsWith(PREFIXO_PAUSA) ? descricao.slice(PREFIXO_PAUSA.length) : descricao;
}

export const PausaFormularioSchema = z
  .object({
    /** Um dos MOTIVOS_PAUSA, ou "outro" para digitar. */
    opcao: z.string().min(1, 'Escolha o motivo'),
    outro: z.string(),
  })
  .transform(({ opcao, outro }) => (opcao === 'outro' ? outro.trim() : opcao))
  .pipe(
    z
      .string()
      .min(5, 'Escreva o motivo (pelo menos 5 caracteres)')
      .max(200, 'Use no máximo 200 caracteres'),
  );

export type PausaFormulario = z.input<typeof PausaFormularioSchema>;

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export const RESPOSTAS_CHECKLIST = ['ok', 'nao_conforme', 'nao_se_aplica'] as const;
export type RespostaChecklist = (typeof RESPOSTAS_CHECKLIST)[number];

export const ROTULOS_RESPOSTA: Record<RespostaChecklist, string> = {
  ok: 'OK',
  nao_conforme: 'Não conforme',
  nao_se_aplica: 'Não se aplica',
};

export type ItemChecklist = {
  posicao: number;
  item: string;
  /** null = ainda não respondido. */
  resposta: RespostaChecklist | null;
  observacao: string | null;
};

export function progressoChecklist(itens: ItemChecklist[]): { respondidos: number; total: number } {
  return {
    respondidos: itens.filter((item) => item.resposta !== null).length,
    total: itens.length,
  };
}

export const ObservacaoChecklistSchema = textoOpcional(500);

// ---------------------------------------------------------------------------
// Anotações (diagnóstico e materiais) e atividades
// ---------------------------------------------------------------------------

export type AnotacoesExecucao = {
  diagnostico: string | null;
  materiais: string | null;
};

export const AnotacoesFormularioSchema = z.object({
  diagnostico: textoOpcional(4000),
  materiais: textoOpcional(2000),
});

export type AnotacoesFormulario = z.input<typeof AnotacoesFormularioSchema>;

export type AtividadeExecucao = {
  id: string;
  descricao: string;
  criadoPorNome: string | null;
  /** ISO 8601 */
  criadoEm: string;
};

export const AtividadeFormularioSchema = z.object({
  descricao: textoObrigatorio('a atividade', 3, 500),
});

export type AtividadeFormulario = z.input<typeof AtividadeFormularioSchema>;

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------

export type FotoDaOrdem = {
  id: string;
  /** Caminho no Storage (regra 9): "empresa/OS/id.jpg". */
  caminho: string;
  legenda: string | null;
  /** ISO 8601: quando a foto foi tirada (pode ser antes do envio). */
  tiradaEm: string;
  criadoPorNome: string | null;
};

export function caminhoDaFoto(organizacaoId: string, ordemId: string, fotoId: string): string {
  return `${organizacaoId}/${ordemId}/${fotoId}.jpg`;
}

export const LegendaFotoSchema = textoOpcional(200);

/** Limite do bucket "anexos" no Storage (10 MB). */
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;

/** Foto guardada no celular esperando sinal para ser enviada (seção 11, "fila de fotos"). */
export type FotoPendente = {
  id: string;
  organizacaoId: string;
  ordemId: string;
  /** JPEG já reduzido no celular. */
  arquivo: Blob;
  legenda: string | null;
  /** ISO 8601 */
  tiradaEm: string;
  /** Recusa definitiva do servidor (ex.: a OS foi cancelada); null = só aguardando sinal. */
  erro: string | null;
};

/** Tudo o que foi registrado na execução de uma OS. */
export type Execucao = {
  anotacoes: AnotacoesExecucao;
  checklist: ItemChecklist[];
  atividades: AtividadeExecucao[];
  fotos: FotoDaOrdem[];
};
