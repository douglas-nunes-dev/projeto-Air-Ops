import type { PostgrestError } from '@supabase/supabase-js';
import { ErroDados } from '@/domain/erros';

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
