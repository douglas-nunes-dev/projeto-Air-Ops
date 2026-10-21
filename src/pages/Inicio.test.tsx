import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { sair } from '@/services/authService';
import { renderizarComRotas, usuarioDeTeste } from '@/test/renderizar';
import { Inicio } from './Inicio';

vi.mock('@/services/authService', () => ({ sair: vi.fn() }));

describe('Inicio', () => {
  it('mostra o nome do sistema, a data em português e quem está logado', () => {
    renderizarComRotas(<Inicio />, '/', { sessao: { usuario: usuarioDeTeste } });

    expect(screen.getByText('AirOps')).toBeInTheDocument();
    expect(screen.getByText(/ de \d{4}$/)).toBeInTheDocument();
    expect(screen.getByText(usuarioDeTeste.email)).toBeInTheDocument();
  });

  it('o botão Sair encerra a sessão', async () => {
    renderizarComRotas(<Inicio />, '/', { sessao: { usuario: usuarioDeTeste } });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }));

    expect(sair).toHaveBeenCalled();
  });
});
