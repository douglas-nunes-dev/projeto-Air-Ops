import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redefinirSenha } from '@/services/authService';
import { renderizarComRotas, usuarioDeTeste } from '@/test/renderizar';
import { RedefinirSenha } from './RedefinirSenha';

vi.mock('@/services/authService', () => ({ redefinirSenha: vi.fn() }));

const redefinirFalso = vi.mocked(redefinirSenha);

function renderizarComSessao() {
  return renderizarComRotas(<RedefinirSenha />, '/redefinir-senha', {
    sessao: { usuario: usuarioDeTeste },
    outrasRotas: { '/': <p>Painel</p> },
  });
}

async function preencher(senha: string, confirmacao: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Nova senha'), senha);
  await usuario.type(screen.getByLabelText('Repita a nova senha'), confirmacao);
  await usuario.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Tela de nova senha', () => {
  it('sem a sessão do link, avisa que o link é inválido', () => {
    renderizarComRotas(<RedefinirSenha />, '/redefinir-senha');

    expect(screen.getByText('Link inválido ou expirado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir novo link' })).toHaveAttribute(
      'href',
      '/recuperar-senha',
    );
  });

  it('recusa quando as senhas não são iguais', async () => {
    renderizarComSessao();

    await preencher('segredo123', 'segredo124');

    expect(await screen.findByText('As senhas não são iguais')).toBeInTheDocument();
    expect(redefinirFalso).not.toHaveBeenCalled();
  });

  it('salva a nova senha e vai para o painel', async () => {
    redefinirFalso.mockResolvedValue();
    renderizarComSessao();

    await preencher('segredo123', 'segredo123');

    expect(redefinirFalso).toHaveBeenCalledWith({ senha: 'segredo123', confirmacao: 'segredo123' });
    expect(await screen.findByText('Painel')).toBeInTheDocument();
    expect(await screen.findByText('Senha alterada com sucesso.')).toBeInTheDocument();
  });
});
