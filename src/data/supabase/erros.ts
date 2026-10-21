import {
  FunctionsFetchError,
  FunctionsHttpError,
  type PostgrestError,
} from '@supabase/supabase-js';
import { ErroDados, type MotivoErroDados } from '@/domain/erros';
import { obterClienteSupabase } from './client';

// Mensagens para as restrições "não pode repetir" criadas nas migrations.
const DUPLICADOS: Record<string, { campo: string; mensagem: string }> = {
  clientes_documento_unico: {
    campo: 'documento',
    mensagem: 'Já existe um cliente com este CPF/CNPJ.',
  },
  equipamentos_patrimonio_unico: {
    campo: 'patrimonio',
    mensagem: 'Já existe um equipamento com este patrimônio.',
  },
};

function erroDeDuplicado(erro: PostgrestError): ErroDados {
  const restricao = Object.keys(DUPLICADOS).find((nome) => erro.message.includes(nome));
  if (!restricao) return new ErroDados('duplicado', { cause: erro });

  const { campo, mensagem } = DUPLICADOS[restricao];
  return new ErroDados('duplicado', { campo, mensagem, cause: erro });
}

// Códigos: https://www.postgresql.org/docs/current/errcodes-appendix.html e PostgREST (PGRST...).
export function converterErroBanco(erro: PostgrestError): ErroDados {
  switch (erro.code) {
    case '23505':
      return erroDeDuplicado(erro);
    case '42501':
      return new ErroDados('sem_permissao', { cause: erro });
    case 'PGRST116':
      return new ErroDados('nao_encontrado', { cause: erro });
    case '23503':
    case '23514':
    case '22P02':
      return new ErroDados('dados_invalidos', { cause: erro });
  }
  if (erro.message.includes('Failed to fetch') || erro.message.includes('NetworkError')) {
    return new ErroDados('sem_conexao', { cause: erro });
  }
  return new ErroDados('desconhecido', { cause: erro });
}

type ErroStorage = { message: string; statusCode?: string; status?: number };

function codigoHttp(erro: ErroStorage): string {
  return erro.statusCode ?? String(erro.status ?? '');
}

/** O arquivo já estava lá: um envio anterior chegou antes de o sinal cair. */
export function eArquivoRepetido(erro: ErroStorage): boolean {
  return codigoHttp(erro) === '409' || erro.message.includes('already exists');
}

export function converterErroStorage(erro: ErroStorage): ErroDados {
  const codigo = codigoHttp(erro);
  if (erro.message.includes('Failed to fetch') || erro.message.includes('NetworkError')) {
    return new ErroDados('sem_conexao', { cause: erro });
  }
  if (codigo === '403' || erro.message.includes('row-level security')) {
    return new ErroDados('sem_permissao', { cause: erro });
  }
  if (codigo === '413') {
    return new ErroDados('dados_invalidos', {
      mensagem: 'A foto é grande demais para enviar.',
      cause: erro,
    });
  }
  return new ErroDados('desconhecido', { cause: erro });
}

/** Lança o erro já convertido, ou devolve os dados quando deu certo. */
export function exigirDados<T>(resposta: {
  data: T;
  error: PostgrestError | null;
}): NonNullable<T> {
  if (resposta.error) throw converterErroBanco(resposta.error);
  if (resposta.data === null || resposta.data === undefined) throw new ErroDados('nao_encontrado');
  return resposta.data;
}

/** Igual a exigirDados, mas devolve null quando não há registro (ex.: busca por id). */
export function dadosOuNulo<T>(resposta: {
  data: T | null;
  error: PostgrestError | null;
}): T | null {
  if (resposta.error) throw converterErroBanco(resposta.error);
  return resposta.data;
}

export function exigirSucesso(resposta: { error: PostgrestError | null }): void {
  if (resposta.error) throw converterErroBanco(resposta.error);
}

// Códigos que as Edge Functions devolvem (ex.: supabase/functions/alterar-status-ordem/regras.ts).
const MOTIVOS_DAS_FUNCOES: Record<string, MotivoErroDados> = {
  sem_permissao: 'sem_permissao',
  nao_encontrado: 'nao_encontrado',
  transicao_invalida: 'dados_invalidos',
  dados_invalidos: 'dados_invalidos',
};

async function converterErroFuncao(erro: unknown): Promise<ErroDados> {
  if (erro instanceof FunctionsFetchError) return new ErroDados('sem_conexao', { cause: erro });
  if (erro instanceof FunctionsHttpError) {
    const corpo: unknown = await (erro.context as Response).json().catch(() => null);
    if (corpo && typeof corpo === 'object') {
      const { codigo, mensagem, campo } = corpo as Record<string, unknown>;
      const motivo = typeof codigo === 'string' ? MOTIVOS_DAS_FUNCOES[codigo] : undefined;
      return new ErroDados(motivo ?? 'desconhecido', {
        mensagem: typeof mensagem === 'string' ? mensagem : undefined,
        campo: typeof campo === 'string' ? campo : undefined,
        cause: erro,
      });
    }
  }
  return new ErroDados('desconhecido', { cause: erro });
}

/** Chama uma Edge Function e converte a recusa dela em ErroDados, com a mensagem do servidor. */
export async function chamarFuncao(nome: string, corpo: Record<string, unknown>): Promise<void> {
  const { error } = await obterClienteSupabase().functions.invoke(nome, { body: corpo });
  if (error) throw await converterErroFuncao(error);
}
