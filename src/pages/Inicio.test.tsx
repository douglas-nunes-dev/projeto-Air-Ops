import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  describe('com agenda', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('conta as atrasadas e mostra a agenda de hoje em ordem de horário', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 9, 21, 11, 0));
      const agendada = { ...ordemDeTeste, status: 'agendada' as const, tecnicoNome: 'João' };
      vi.mocked(listarClientes).mockResolvedValue([]);
      vi.mocked(listarEquipamentos).mockResolvedValue([]);
      vi.mocked(listarOrdens).mockResolvedValue([
        {
          ...agendada,
          id: 'tarde',
          numero: 2,
          agendadaPara: new Date(2026, 9, 21, 15).toISOString(),
        },
        // 8h de hoje e ainda não começou: atrasada.
        {
          ...agendada,
          id: 'cedo',
          numero: 1,
          agendadaPara: new Date(2026, 9, 21, 8).toISOString(),
        },
        {
          ...agendada,
          id: 'amanha',
          numero: 3,
          agendadaPara: new Date(2026, 9, 22, 9).toISOString(),
        },
      ]);

      renderizarComRotas(<Inicio />, '/');

      expect(await screen.findByRole('link', { name: /OS atrasadas\s*1/ })).toHaveAttribute(
        'href',
        '/ordens?situacao=atrasadas',
      );
      expect(screen.getByRole('link', { name: /Atendimentos hoje\s*2/ })).toHaveAttribute(
        'href',
        '/agenda?visao=dia',
      );
      const agenda = screen
        .getByText('Agenda de hoje')
        .closest('div[data-slot=card]') as HTMLElement;
      const linhas = within(agenda)
        .getAllByRole('link')
        .map((link) => link.textContent);
      expect(linhas[0]).toMatch(/^08:00OS 1/);
      expect(linhas[1]).toMatch(/^15:00OS 2/);
      expect(linhas).toHaveLength(2);
    });
  });
});
