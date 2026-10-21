import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chamarFuncao } from './erros';

const invocar = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  obterClienteSupabase: () => ({ functions: { invoke: invocar } }),
}));

function recusa(status: number, corpo: unknown) {
  return new FunctionsHttpError(new Response(JSON.stringify(corpo), { status }));
}

beforeEach(() => {
  invocar.mockReset();
});

describe('chamarFuncao', () => {
  it('envia o corpo para a Edge Function', async () => {
    invocar.mockResolvedValue({ data: { ok: true }, error: null });
    await chamarFuncao('alterar-status-ordem', { acao: 'cancelar' });
    expect(invocar).toHaveBeenCalledWith('alterar-status-ordem', {
      body: { acao: 'cancelar' },
      // Sem limite, um sinal que cai no meio deixaria o botão em "Aguarde…" para sempre.
      timeout: 20_000,
    });
  });

  it('a recusa do servidor vira ErroDados com a mensagem e o campo dele', async () => {
    invocar.mockResolvedValue({
      data: null,
      error: recusa(400, {
        codigo: 'dados_invalidos',
        mensagem: 'Escolha um técnico ativo da empresa.',
        campo: 'tecnicoId',
      }),
    });
    await expect(chamarFuncao('alterar-status-ordem', {})).rejects.toMatchObject({
      motivo: 'dados_invalidos',
      message: 'Escolha um técnico ativo da empresa.',
      campo: 'tecnicoId',
    });
  });

  it('transição inválida e sem permissão também chegam com a mensagem do servidor', async () => {
    invocar.mockResolvedValue({
      data: null,
      error: recusa(403, { codigo: 'sem_permissao', mensagem: 'Só administradores e gestores.' }),
    });
    await expect(chamarFuncao('x', {})).rejects.toMatchObject({
      motivo: 'sem_permissao',
      message: 'Só administradores e gestores.',
    });
  });

  it('sem internet vira erro de conexão', async () => {
    invocar.mockResolvedValue({ data: null, error: new FunctionsFetchError('Failed to fetch') });
    await expect(chamarFuncao('x', {})).rejects.toMatchObject({ motivo: 'sem_conexao' });
  });
});
