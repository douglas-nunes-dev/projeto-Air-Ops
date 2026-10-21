import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthProvider } from '@/data/repositories/AuthProvider';
import { enviarRecuperacaoSenha, entrar, redefinirSenha } from './authService';

// O service só conhece a interface: aqui ela é trocada por uma versão falsa.
const provedorFalso = vi.hoisted(() => ({
  entrar: vi.fn(),
  sair: vi.fn(),
  usuarioAtual: vi.fn(),
  enviarRecuperacaoSenha: vi.fn(),
  redefinirSenha: vi.fn(),
  observarSessao: vi.fn(),
})) satisfies AuthProvider;

vi.mock('@/data', () => ({ authProvider: provedorFalso }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  it('entrar valida os dados e repassa e-mail sem espaços', async () => {
    provedorFalso.entrar.mockResolvedValue({ id: '1', email: 'ana@airops.com.br' });

    const usuario = await entrar({ email: ' ana@airops.com.br ', senha: 'segredo123' });

    expect(provedorFalso.entrar).toHaveBeenCalledWith('ana@airops.com.br', 'segredo123');
    expect(usuario.email).toBe('ana@airops.com.br');
  });

  it('entrar não chama o provedor quando o e-mail é inválido', async () => {
    await expect(entrar({ email: 'ana', senha: 'x' })).rejects.toThrow();
    expect(provedorFalso.entrar).not.toHaveBeenCalled();
  });

  it('a recuperação de senha volta para /redefinir-senha neste mesmo endereço', async () => {
    await enviarRecuperacaoSenha({ email: 'ana@airops.com.br' });

    expect(provedorFalso.enviarRecuperacaoSenha).toHaveBeenCalledWith(
      'ana@airops.com.br',
      `${window.location.origin}/redefinir-senha`,
    );
  });

  it('redefinirSenha recusa senha curta sem chamar o provedor', async () => {
    await expect(redefinirSenha({ senha: '123', confirmacao: '123' })).rejects.toThrow();
    expect(provedorFalso.redefinirSenha).not.toHaveBeenCalled();
  });
});
