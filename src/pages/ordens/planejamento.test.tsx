import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDados } from '@/domain/erros';
import {
  agendarOrdem,
  buscarOrdem,
  cancelarOrdem,
  listarEventosDaOrdem,
  listarOrdens,
} from '@/services/ordemService';
import { listarMembros } from '@/services/organizacaoService';
import { ordemDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas } from '@/test/renderizar';
import { DetalheOrdem } from './DetalheOrdem';

vi.mock('@/services/ordemService');
vi.mock('@/services/organizacaoService');

const joao = {
  usuarioId: '00000000-0000-4000-8000-000000000003',
  nome: 'João Técnico',
  papeis: ['tecnico' as const],
  ativo: true,
};
const gestora = {
  ...joao,
  usuarioId: '00000000-0000-4000-8000-000000000002',
  nome: 'Ana',
  papeis: ['gestor' as const],
};

function abrirDetalhe(ordem = ordemDeTeste, organizacao = organizacaoDeTeste) {
  vi.mocked(buscarOrdem).mockResolvedValue(ordem);
  return renderizarComRotas(<DetalheOrdem />, '/ordens/:id', {
    rota: `/ordens/${ordem.id}`,
    organizacao,
  });
}

async function preencherHorario(dialogo: HTMLElement, data: string, hora: string) {
  const usuario = userEvent.setup();
  await usuario.clear(within(dialogo).getByLabelText('Data'));
  await usuario.type(within(dialogo).getByLabelText('Data'), data);
  await usuario.clear(within(dialogo).getByLabelText('Hora'));
  await usuario.type(within(dialogo).getByLabelText('Hora'), hora);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarMembros).mockResolvedValue([joao, gestora]);
  vi.mocked(listarOrdens).mockResolvedValue([ordemDeTeste]);
  vi.mocked(listarEventosDaOrdem).mockResolvedValue([]);
});

describe('Agendar pelo detalhe da OS', () => {
  it('escolhe técnico, data e hora e agenda', async () => {
    vi.mocked(agendarOrdem).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirDetalhe();

    await usuario.click(await screen.findByRole('button', { name: 'Agendar' }));
    const dialogo = await screen.findByRole('dialog');
    // Só quem tem o papel de técnico aparece na lista.
    const tecnico = await within(dialogo).findByLabelText('Técnico');
    expect(within(tecnico).queryByText('Ana')).not.toBeInTheDocument();

    await usuario.selectOptions(tecnico, joao.usuarioId);
    await preencherHorario(dialogo, '2026-10-22', '14:00');
    await usuario.selectOptions(within(dialogo).getByLabelText('Duração prevista'), '90');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agendar' }));

    expect(await screen.findByText('OS 7 agendada.')).toBeInTheDocument();
    expect(agendarOrdem).toHaveBeenCalledWith(ordemDeTeste, {
      tecnicoId: joao.usuarioId,
      data: '2026-10-22',
      hora: '14:00',
      duracaoMinutos: '90',
    });
  });

  it('avisa quando o técnico já tem atendimento no mesmo horário', async () => {
    const ocupada = {
      ...ordemDeTeste,
      id: 'outra',
      numero: 3,
      clienteNome: 'Padaria Pão Bom',
      status: 'agendada' as const,
      tecnicoId: joao.usuarioId,
      agendadaPara: new Date(2026, 9, 22, 13, 30).toISOString(),
    };
    vi.mocked(listarOrdens).mockResolvedValue([ordemDeTeste, ocupada]);
    const usuario = userEvent.setup();
    abrirDetalhe();

    await usuario.click(await screen.findByRole('button', { name: 'Agendar' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.selectOptions(await within(dialogo).findByLabelText('Técnico'), joao.usuarioId);
    await preencherHorario(dialogo, '2026-10-22', '14:00');

    expect(within(dialogo).getByText(/já tem atendimento nesse horário/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/OS 3 .* Padaria Pão Bom/)).toBeInTheDocument();
  });

  it('a recusa do servidor aparece no campo certo', async () => {
    vi.mocked(agendarOrdem).mockRejectedValue(
      new ErroDados('dados_invalidos', {
        mensagem: 'Escolha um técnico ativo da empresa.',
        campo: 'tecnicoId',
      }),
    );
    const usuario = userEvent.setup();
    abrirDetalhe();

    await usuario.click(await screen.findByRole('button', { name: 'Agendar' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.selectOptions(await within(dialogo).findByLabelText('Técnico'), joao.usuarioId);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agendar' }));

    expect(
      await within(dialogo).findByText('Escolha um técnico ativo da empresa.'),
    ).toBeInTheDocument();
  });

  it('OS agendada mostra técnico e horário e oferece "Reagendar"', async () => {
    abrirDetalhe({
      ...ordemDeTeste,
      status: 'agendada',
      tecnicoId: joao.usuarioId,
      tecnicoNome: joao.nome,
      agendadaPara: new Date(2026, 9, 22, 14).toISOString(),
      duracaoMinutos: 90,
    });

    expect(await screen.findByRole('button', { name: 'Reagendar' })).toBeInTheDocument();
    expect(screen.getByText('João Técnico')).toBeInTheDocument();
    expect(screen.getByText('22/10/2026 às 14:00')).toBeInTheDocument();
    expect(screen.getByText('1h30 (até 15:30)')).toBeInTheDocument();
  });
});

describe('Cancelar pelo detalhe da OS', () => {
  it('pede o motivo e cancela', async () => {
    vi.mocked(cancelarOrdem).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirDetalhe();

    await usuario.click(await screen.findByRole('button', { name: 'Cancelar OS' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar OS' }));
    expect(await within(dialogo).findByText(/Escreva o motivo/)).toBeInTheDocument();

    await usuario.type(
      within(dialogo).getByLabelText('Motivo do cancelamento'),
      'Aberta em duplicidade',
    );
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar OS' }));

    expect(await screen.findByText('OS 7 cancelada.')).toBeInTheDocument();
    expect(cancelarOrdem).toHaveBeenCalledWith(ordemDeTeste, { motivo: 'Aberta em duplicidade' });
  });

  it('OS cancelada mostra o motivo e não tem mais ações', async () => {
    abrirDetalhe({ ...ordemDeTeste, status: 'cancelada', motivoCancelamento: 'Duplicada' });

    expect(await screen.findByText(/Motivo: Duplicada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agendar|Cancelar OS/ })).not.toBeInTheDocument();
  });
});

describe('Quem pode planejar', () => {
  it('técnico não vê agendar nem cancelar', async () => {
    abrirDetalhe(ordemDeTeste, { ...organizacaoDeTeste, papeis: ['tecnico'] });

    expect(await screen.findByRole('heading', { name: 'OS 7' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agendar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar OS' })).not.toBeInTheDocument();
  });

  it('OS em execução pode ser cancelada, mas não reagendada', async () => {
    abrirDetalhe({ ...ordemDeTeste, status: 'em_execucao', tecnicoId: joao.usuarioId });

    expect(await screen.findByRole('button', { name: 'Cancelar OS' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agendar|Reagendar/ })).not.toBeInTheDocument();
  });
});
