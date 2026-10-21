import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroAutenticacao } from '@/domain/auth/erros';
import { entrar } from '@/services/authService';
import { renderizarComRotas, usuarioDeTeste } from '@/test/renderizar';
import { Entrar } from './Entrar';

vi.mock('@/services/authService', () => ({ entrar: vi.fn() }));

const entrarFalso = vi.mocked(entrar);

function renderizarLogin(voltarPara?: string) {
  return renderizarComRotas(<Entrar />, '/entrar', {
    rota: { pathname: '/entrar', state: voltarPara ? { voltarPara } : null },
    outrasRotas: { '/': <p>Painel</p>, '/ordens': <p>Ordens</p> },
  });
}

async function preencherEEnviar(email: string, senha: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('E-mail'), email);
  await usuario.type(screen.getByLabelText('Senha'), senha);
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Tela de login', () => {
  it('mostra os erros de validação sem chamar o login', async () => {
    renderizarLogin();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(entrarFalso).not.toHaveBeenCalled();
  });

  it('entra e vai para o painel', async () => {
    entrarFalso.mockResolvedValue(usuarioDeTeste);
    renderizarLogin();

    await preencherEEnviar('tecnico@airops.com.br', 'segredo123');

    expect(entrarFalso).toHaveBeenCalledWith({
      email: 'tecnico@airops.com.br',
      senha: 'segredo123',
    });
    expect(await screen.findByText('Painel')).toBeInTheDocument();
  });

  it('volta para a página que a pessoa tentou abrir antes do login', async () => {
    entrarFalso.mockResolvedValue(usuarioDeTeste);
    renderizarLogin('/ordens');

    await preencherEEnviar('tecnico@airops.com.br', 'segredo123');

    expect(await screen.findByText('Ordens')).toBeInTheDocument();
  });

  it('mostra a mensagem quando o e-mail ou a senha estão errados', async () => {
    entrarFalso.mockRejectedValue(new ErroAutenticacao('credenciais_invalidas'));
    renderizarLogin();

    await preencherEEnviar('tecnico@airops.com.br', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByTestId('endereco')).toHaveTextContent('/entrar');
  });

  it('quem já está logado vai direto para o painel', () => {
    renderizarComRotas(<Entrar />, '/entrar', {
      sessao: { usuario: usuarioDeTeste },
      outrasRotas: { '/': <p>Painel</p> },
    });

    expect(screen.getByText('Painel')).toBeInTheDocument();
  });

  it('tem link para recuperar a senha', () => {
    renderizarLogin();

    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute(
      'href',
      '/recuperar-senha',
    );
  });
});
