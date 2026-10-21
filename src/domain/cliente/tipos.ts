import { z } from 'zod';
import {
  emailOpcional,
  somenteDigitos,
  telefoneOpcional,
  textoObrigatorio,
  textoOpcional,
} from '@/domain/comum/campos';
import { cnpjValido, cpfValido } from './documento';

export const TIPOS_PESSOA = ['juridica', 'fisica'] as const;
export type TipoPessoa = (typeof TIPOS_PESSOA)[number];

export const ROTULOS_TIPO_PESSOA: Record<TipoPessoa, string> = {
  juridica: 'Empresa (CNPJ)',
  fisica: 'Pessoa física (CPF)',
};

export type Cliente = {
  id: string;
  organizacaoId: string;
  tipoPessoa: TipoPessoa;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  contatoNome: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export const ClienteFormularioSchema = z
  .object({
    tipoPessoa: z.enum(TIPOS_PESSOA),
    nome: textoObrigatorio('o nome', 2, 150),
    documento: z.string().transform(somenteDigitos),
    telefone: telefoneOpcional,
    email: emailOpcional,
    contatoNome: textoOpcional(120),
    observacoes: textoOpcional(2000),
  })
  .superRefine((dados, contexto) => {
    if (dados.documento === '') return;

    const valido =
      dados.tipoPessoa === 'fisica' ? cpfValido(dados.documento) : cnpjValido(dados.documento);
    if (!valido) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documento'],
        message: dados.tipoPessoa === 'fisica' ? 'CPF inválido' : 'CNPJ inválido',
      });
    }
  })
  .transform((dados) => ({ ...dados, documento: dados.documento === '' ? null : dados.documento }));

/** O que a tela preenche (tudo texto). */
export type ClienteFormulario = z.input<typeof ClienteFormularioSchema>;
/** O que vai para o banco, já validado e normalizado. */
export type DadosCliente = z.output<typeof ClienteFormularioSchema>;

export const CLIENTE_FORMULARIO_VAZIO: ClienteFormulario = {
  tipoPessoa: 'juridica',
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  contatoNome: '',
  observacoes: '',
};

export function clienteParaFormulario(cliente: Cliente): ClienteFormulario {
  return {
    tipoPessoa: cliente.tipoPessoa,
    nome: cliente.nome,
    documento: cliente.documento ?? '',
    telefone: cliente.telefone ?? '',
    email: cliente.email ?? '',
    contatoNome: cliente.contatoNome ?? '',
    observacoes: cliente.observacoes ?? '',
  };
}
