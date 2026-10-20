import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { Inicio } from './Inicio';

describe('Inicio', () => {
  it('mostra o nome do sistema e a data em português', () => {
    render(<Inicio />);

    expect(screen.getByText('AirOps')).toBeInTheDocument();
    expect(screen.getByText(/ de \d{4}$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /testar/i })).toBeEnabled();
  });

  it('mostra um aviso ao clicar em Testar', async () => {
    const usuario = userEvent.setup();
    render(
      <>
        <Inicio />
        <Toaster />
      </>,
    );

    await usuario.click(screen.getByRole('button', { name: /testar/i }));

    expect(await screen.findByText('Ambiente configurado')).toBeInTheDocument();
  });
});
