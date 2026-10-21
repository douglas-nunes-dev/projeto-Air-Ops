import { z } from 'zod';
import {
  MOTIVO_SEM_ASSINATURA_MAXIMO,
  MOTIVO_SEM_ASSINATURA_MINIMO,
  NOME_ASSINANTE_MAXIMO,
  NOME_ASSINANTE_MINIMO,
} from './conclusao';

// Formulário "Concluir atendimento" (etapa 5). Os limites são os mesmos da Edge Function.

export const ConclusaoFormularioSchema = z
  .object({
    /** O cliente não pôde assinar (ex.: responsável ausente). */
    semAssinatura: z.boolean(),
    /** Algo foi desenhado no quadro de assinatura. */
    assinou: z.boolean(),
    nomeAssinante: z.string(),
    motivoSemAssinatura: z.string(),
  })
  .superRefine((dados, contexto) => {
    if (dados.semAssinatura) {
      const motivo = dados.motivoSemAssinatura.trim();
      if (
        motivo.length < MOTIVO_SEM_ASSINATURA_MINIMO ||
        motivo.length > MOTIVO_SEM_ASSINATURA_MAXIMO
      ) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['motivoSemAssinatura'],
          message: `Explique por que não há assinatura (de ${MOTIVO_SEM_ASSINATURA_MINIMO} a ${MOTIVO_SEM_ASSINATURA_MAXIMO} caracteres)`,
        });
      }
      return;
    }
    if (!dados.assinou) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assinou'],
        message: 'Peça para o cliente assinar no quadro',
      });
    }
    const nome = dados.nomeAssinante.trim();
    if (nome.length < NOME_ASSINANTE_MINIMO || nome.length > NOME_ASSINANTE_MAXIMO) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nomeAssinante'],
        message: 'Informe o nome de quem assinou',
      });
    }
  })
  .transform((dados) =>
    dados.semAssinatura
      ? { motivoSemAssinatura: dados.motivoSemAssinatura.trim() }
      : { nomeAssinante: dados.nomeAssinante.trim() },
  );

export type ConclusaoFormulario = z.input<typeof ConclusaoFormularioSchema>;
export type DadosConclusao = z.output<typeof ConclusaoFormularioSchema>;

export const CONCLUSAO_FORMULARIO_VAZIO: ConclusaoFormulario = {
  semAssinatura: false,
  assinou: false,
  nomeAssinante: '',
  motivoSemAssinatura: '',
};
