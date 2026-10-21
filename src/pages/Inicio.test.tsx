import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { listarClientes } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { renderizarComRotas } from '@/test/renderizar';
import { clienteDeTeste, equipamentoDeTeste } from '@/test/dados';
import { Inicio } from './Inicio';

vi.mock('@/services/clienteService', () => ({ listarClientes: vi.fn() }));
vi.mock('@/services/equipamentoService', () => ({ listarEquipamentos: vi.fn() }));

describe('Painel', () => {
  it('mostra a data em português e os totais de cadastros ativos', async () => {
    vi.mocked(listarClientes).mockResolvedValue([
      clienteDeTeste,
      { ...clienteDeTeste, id: 'c2', ativo: false },
    ]);
    vi.mocked(listarEquipamentos).mockResolvedValue([equipamentoDeTeste]);

    renderizarComRotas(<Inicio />, '/');

    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByText(/ de \d{4}$/)).toBeInTheDocument();
    // Cliente arquivado não entra na conta.
    expect(await screen.findByRole('link', { name: /Clientes\s*1/ })).toHaveAttribute(
      'href',
      '/clientes',
    );
    expect(screen.getByRole('link', { name: /Equipamentos\s*1/ })).toHaveAttribute(
      'href',
      '/equipamentos',
    );
  });
});
