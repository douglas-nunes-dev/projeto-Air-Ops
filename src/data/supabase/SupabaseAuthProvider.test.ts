import { AuthApiError, AuthSessionMissingError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroAutenticacao } from '@/domain/auth/erros';
import { SupabaseAuthProvider } from './SupabaseAuthProvider';

const authFalso = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('./client', () => ({
  obterClienteSupabase: () => ({ auth: authFalso }),
}));

const provedor = new SupabaseAuthProvider();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupabaseAuthProvider', () => {
  it('converte o usuário do Supabase para o tipo do domínio', async () => {
    authFalso.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', email: 'ana@airops.com.br', app_metadata: {} } },
      error: null,
    });

    await expect(provedor.entrar('ana@airops.com.br', 'segredo123')).resolves.toEqual({
      id: 'u1',
      email: 'ana@airops.com.br',
    });
  });

  it.each([
    ['invalid_credentials', 'credenciais_invalidas'],
    ['email_not_confirmed', 'email_nao_confirmado'],
    ['over_request_rate_limit', 'muitas_tentativas'],
    ['codigo_que_nao_existe', 'desconhecido'],
  ])('erro "%s" do Supabase vira motivo "%s"', async (codigo, motivo) => {
    authFalso.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError('falhou', 400, codigo),
    });

    const erro = await provedor.entrar('ana@airops.com.br', 'x').catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroAutenticacao);
    expect(erro).toHaveProperty('motivo', motivo);
  });

  it('sem sessão ao redefinir a senha, avisa que o link expirou', async () => {
    authFalso.updateUser.mockResolvedValue({ data: {}, error: new AuthSessionMissingError() });

    await expect(provedor.redefinirSenha('segredo123')).rejects.toHaveProperty(
      'motivo',
      'sessao_expirada',
    );
  });

  it('falha de rede vira erro desconhecido', async () => {
    authFalso.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(provedor.entrar('ana@airops.com.br', 'x')).rejects.toHaveProperty(
      'motivo',
      'desconhecido',
    );
  });
});
