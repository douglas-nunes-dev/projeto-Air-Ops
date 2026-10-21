import { z } from 'zod';
import { cepOpcional, textoObrigatorio, textoOpcional } from '@/domain/comum/campos';

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

/** Endereço, unidade ou setor do cliente (ex.: "Bloco B — UTI"). */
export type LocalAtendimento = {
  id: string;
  organizacaoId: string;
  clienteId: string;
  nome: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export const LocalFormularioSchema = z.object({
  nome: textoObrigatorio('o nome do local', 2, 120),
  cep: cepOpcional,
  logradouro: textoOpcional(150),
  numero: textoOpcional(20),
  complemento: textoOpcional(100),
  bairro: textoOpcional(100),
  cidade: textoOpcional(100),
  uf: z
    .string()
    .refine((uf) => uf === '' || (UFS as readonly string[]).includes(uf), {
      message: 'UF inválida',
    })
    .transform((uf) => (uf === '' ? null : uf)),
  observacoes: textoOpcional(2000),
});

export type LocalFormulario = z.input<typeof LocalFormularioSchema>;
export type DadosLocal = z.output<typeof LocalFormularioSchema>;

export const LOCAL_FORMULARIO_VAZIO: LocalFormulario = {
  nome: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
};

/** Endereço numa linha só, para listas e relatórios. */
export function resumirEndereco(local: LocalAtendimento): string {
  const rua = [local.logradouro, local.numero].filter(Boolean).join(', ');
  const cidade = [local.cidade, local.uf].filter(Boolean).join('/');
  return [rua, local.bairro, cidade].filter(Boolean).join(' — ');
}

export function localParaFormulario(local: LocalAtendimento): LocalFormulario {
  return {
    nome: local.nome,
    cep: local.cep ?? '',
    logradouro: local.logradouro ?? '',
    numero: local.numero ?? '',
    complemento: local.complemento ?? '',
    bairro: local.bairro ?? '',
    cidade: local.cidade ?? '',
    uf: local.uf ?? '',
    observacoes: local.observacoes ?? '',
  };
}
