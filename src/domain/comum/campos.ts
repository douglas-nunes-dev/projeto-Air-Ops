import { z } from 'zod';

// Peças de validação reaproveitadas pelos formulários de cadastro.
// Os campos chegam da tela como texto; vazio vira null para o banco.

export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

function vazioParaNull(texto: string): string | null {
  return texto === '' ? null : texto;
}

// Uma mensagem por vez: vazio pede para preencher; curto ou longo diz o limite.
function problemaDoTexto(texto: string, rotulo: string, minimo: number, maximo: number) {
  if (texto === '') return `Informe ${rotulo}`;
  if (texto.length < minimo) return `Use pelo menos ${minimo} caracteres`;
  if (texto.length > maximo) return `Use no máximo ${maximo} caracteres`;
  return null;
}

export function textoObrigatorio(rotulo: string, minimo: number, maximo: number) {
  return z
    .string()
    .trim()
    .superRefine((texto, contexto) => {
      const problema = problemaDoTexto(texto, rotulo, minimo, maximo);
      if (problema) contexto.addIssue({ code: z.ZodIssueCode.custom, message: problema });
    });
}

export function textoOpcional(maximo: number) {
  return z
    .string()
    .trim()
    .max(maximo, `Use no máximo ${maximo} caracteres`)
    .transform(vazioParaNull);
}

export const emailOpcional = z
  .string()
  .trim()
  .max(150, 'Use no máximo 150 caracteres')
  .refine((email) => email === '' || z.string().email().safeParse(email).success, {
    message: 'Informe um e-mail válido',
  })
  .transform(vazioParaNull);

export const telefoneOpcional = z
  .string()
  .transform(somenteDigitos)
  .refine((digitos) => digitos === '' || digitos.length === 10 || digitos.length === 11, {
    message: 'Informe o DDD e o número (10 ou 11 dígitos)',
  })
  .transform(vazioParaNull);

export const cepOpcional = z
  .string()
  .transform(somenteDigitos)
  .refine((digitos) => digitos === '' || digitos.length === 8, { message: 'O CEP tem 8 dígitos' })
  .transform(vazioParaNull);

/** Data sem horário no formato do campo de data do navegador: AAAA-MM-DD. */
export const dataOpcional = z
  .string()
  .refine((data) => data === '' || /^\d{4}-\d{2}-\d{2}$/.test(data), {
    message: 'Informe uma data válida',
  })
  .transform(vazioParaNull);

export function inteiroOpcional(rotulo: string, minimo: number, maximo: number) {
  return z
    .string()
    .transform(somenteDigitos)
    .transform((digitos) => (digitos === '' ? null : Number(digitos)))
    .refine((numero) => numero === null || (numero >= minimo && numero <= maximo), {
      message: `${rotulo} deve ficar entre ${minimo.toLocaleString('pt-BR')} e ${maximo.toLocaleString('pt-BR')}`,
    });
}
