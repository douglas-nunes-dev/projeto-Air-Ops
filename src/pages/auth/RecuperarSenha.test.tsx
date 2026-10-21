import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroAutenticacao } from '@/domain/auth/erros';
import { enviarRecuperacaoSenha } from '@/services/authService';
import { renderizarComRotas } from '@/test/renderizar';
import { RecuperarSenha } from './RecuperarSenha';

vi.mock('@/services/authService', () => ({ enviarRecuperacaoSenha: vi.fn() }));

const enviarFalso = vi.mocked(enviarRecuperacaoSenha);

async function pedirLink(email: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('E-mail'), email);
  await usuario.click(screen.getByRole('button', { name: 'Enviar link' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Tela de recuperação de senha', () => {
  it('envia o link e mostra a confirmação', async () => {
    enviarFalso.mockResolvedValue();
    renderizarComRotas(<RecuperarSenha />, '/recuperar-senha');

    await pedirLink('ana@airops.com.br');

    expect(enviarFalso).toHaveBeenCalledWith({ email: 'ana@airops.com.br' });
    expect(await screen.findByText('Verifique seu e-mail')).toBeInTheDocument();
  });

  it('avisa quando houve muitas tentativas', async () => {
    enviarFalso.mockRejectedValue(new ErroAutenticacao('muitas_tentativas'));
    renderizarComRotas(<RecuperarSenha />, '/recuperar-senha');

    await pedirLink('ana@airops.com.br');

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas seguidas');
  });

  it('não envia com e-mail inválido', async () => {
    renderizarComRotas(<RecuperarSenha />, '/recuperar-senha');

    await pedirLink('ana');

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument();
    expect(enviarFalso).not.toHaveBeenCalled();
  });
});
