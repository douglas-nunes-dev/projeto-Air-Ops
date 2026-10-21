import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@/components/ui/sidebar';
import { buscarClima } from '@/services/climaService';
import { renderizarComRotas } from '@/test/renderizar';
import { RodapeMenu } from './RodapeMenu';

vi.mock('@/services/climaService');

function renderizar() {
  return renderizarComRotas(
    <SidebarProvider>
      <RodapeMenu />
    </SidebarProvider>,
    '/',
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 9, 20, 14, 5));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Rodapé do menu', () => {
  it('mostra saudação, primeiro nome, hora e o clima da cidade', async () => {
    vi.mocked(buscarClima).mockResolvedValue({
      temperatura: 25,
      codigo: 0,
      ehDia: true,
      cidade: 'Passos/MG',
    });
    renderizar();

    expect(screen.getByText('Boa tarde, Douglas!')).toBeInTheDocument();
    expect(screen.getByText('14:05')).toBeInTheDocument();
    expect(await screen.findByText('25 °C')).toBeInTheDocument();
    expect(screen.getByText('· Céu limpo')).toBeInTheDocument();
    expect(screen.getByText('Passos/MG')).toBeInTheDocument();
  });

  it('sem localização do navegador, usa Passos/MG', async () => {
    vi.mocked(buscarClima).mockResolvedValue({
      temperatura: 18,
      codigo: 61,
      ehDia: false,
      cidade: 'Passos/MG',
    });
    renderizar();

    await screen.findByText('18 °C');
    expect(buscarClima).toHaveBeenCalledWith({ latitude: -20.72, longitude: -46.61 });
  });

  it('se o clima falhar, a saudação continua e a linha do clima some', async () => {
    vi.mocked(buscarClima).mockRejectedValue(new Error('fora do ar'));
    renderizar();

    expect(screen.getByText('Boa tarde, Douglas!')).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText(/Carregando o clima/)).toBeNull());
    expect(screen.queryByText(/°C/)).toBeNull();
  });
});
