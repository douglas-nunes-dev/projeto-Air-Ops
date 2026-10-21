import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { listarClientes } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { listarOrdens } from '@/services/ordemService';
import { renderizarComRotas } from '@/test/renderizar';
import { clienteDeTeste, equipamentoDeTeste, ordemDeTeste } from '@/test/dados';
import { Inicio } from './Inicio';

vi.mock('@/services/clienteService', () => ({ listarClientes: vi.fn() }));
vi.mock('@/services/equipamentoService', () => ({ listarEquipamentos: vi.fn() }));
vi.mock('@/services/ordemService', () => ({ listarOrdens: vi.fn() }));

describe('Painel', () => {
  it('mostra a data em português e os totais de cadastros ativos', async () => {
    vi.mocked(listarClientes).mockResolvedValue([
      clienteDeTeste,
      { ...clienteDeTeste, id: 'c2', ativo: false },
    ]);
    vi.mocked(listarEquipamentos).mockResolvedValue([equipamentoDeTeste]);
    vi.mocked(listarOrdens).mockResolvedValue([
      ordemDeTeste,
      { ...ordemDeTeste, id: 'o2', prioridade: 'urgente' },
      // Concluída não conta como em andamento.
      { ...ordemDeTeste, id: 'o3', prioridade: 'urgente', status: 'concluida' },
    ]);

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
    expect(screen.getByRole('link', { name: /OS em andamento\s*2/ })).toHaveAttribute(
      'href',
      '/ordens',
    );
    expect(screen.getByRole('link', { name: /OS urgentes\s*1/ })).toHaveAttribute(
      'href',
      '/ordens?prioridade=urgente',
    );
  });
});
