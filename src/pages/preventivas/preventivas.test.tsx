import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { diaNoFuso, somarDias } from '@/domain/equipamento/preventiva';
import type { Equipamento } from '@/domain/equipamento/tipos';
import type { Ordem } from '@/domain/ordem/tipos';
import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';
import { listarClientes } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { abrirOrdem, listarOrdens } from '@/services/ordemService';
import { equipamentoDeTeste, ordemDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas } from '@/test/renderizar';
import { Inicio } from '../Inicio';
import { Preventivas } from './Preventivas';

vi.mock('@/services/equipamentoService');
vi.mock('@/services/ordemService');
vi.mock('@/services/clienteService');

const hoje = diaNoFuso(new Date());
const tecnico: OrganizacaoDoUsuario = { ...organizacaoDeTeste, papeis: ['tecnico'] };

function equipamento(mudancas: Partial<Equipamento>): Equipamento {
  return { ...equipamentoDeTeste, periodicidadeDias: 30, ...mudancas };
}

const uti1 = equipamento({
  id: 'uti-1',
  identificacao: 'Split UTI 1',
  proximaManutencao: somarDias(hoje, -5),
});
const uti2 = equipamento({
  id: 'uti-2',
  identificacao: 'Split UTI 2',
  proximaManutencao: somarDias(hoje, 10),
});
const recepcao = equipamento({
  id: 'rec-1',
  identificacao: 'Split recepção',
  localId: 'local-recepcao',
  localNome: 'Recepção',
  proximaManutencao: somarDias(hoje, 3),
});
const comOsAberta = equipamento({
  id: 'uti-3',
  identificacao: 'Split UTI 3',
  proximaManutencao: somarDias(hoje, -1),
});
const emDia = equipamento({
  id: 'em-dia',
  identificacao: 'Split em dia',
  proximaManutencao: somarDias(hoje, 90),
});
const osAberta: Ordem = {
  ...ordemDeTeste,
  id: 'os-9',
  numero: 9,
  tipoServico: 'preventiva',
  status: 'agendada',
  equipamentos: [{ id: 'uti-3', identificacao: 'Split UTI 3' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarEquipamentos).mockResolvedValue([uti1, uti2, recepcao, comOsAberta, emDia]);
  vi.mocked(listarOrdens).mockResolvedValue([osAberta]);
});

describe('Preventivas', () => {
  it('lista vencidas e vencendo por local; a já encaminhada aponta a OS', async () => {
    renderizarComRotas(<Preventivas />, '/preventivas');

    expect(await screen.findByText('Vencida há 5 dias')).toBeInTheDocument();
    expect(screen.getByText('Vence em 10 dias')).toBeInTheDocument();
    expect(screen.getByText('Vence em 3 dias')).toBeInTheDocument();
    expect(screen.queryByText('Split em dia')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OS 9 já aberta' })).toHaveAttribute(
      'href',
      '/ordens/os-9',
    );
    // A que já tem OS aberta não pode ser marcada de novo.
    expect(screen.queryByLabelText('Incluir Split UTI 3')).not.toBeInTheDocument();
    expect(screen.getByText('2 vencidas')).toBeInTheDocument();
  });

  it('gera uma OS de preventiva por local com os equipamentos marcados', async () => {
    let numero = 20;
    vi.mocked(abrirOrdem).mockImplementation(async () => ({ ...ordemDeTeste, numero: numero++ }));
    const usuario = userEvent.setup();
    renderizarComRotas(<Preventivas />, '/preventivas');

    await usuario.click(await screen.findByLabelText('Incluir Split UTI 1'));
    await usuario.click(screen.getByLabelText('Incluir Split UTI 2'));
    await usuario.click(screen.getByLabelText('Incluir Split recepção'));
    await usuario.click(screen.getByRole('button', { name: 'Gerar 2 OS' }));

    expect(
      await screen.findByText('2 OS de preventiva abertas (OS 20, OS 21). Agende os técnicos.'),
    ).toBeInTheDocument();
    expect(abrirOrdem).toHaveBeenCalledTimes(2);
    expect(abrirOrdem).toHaveBeenCalledWith(
      organizacaoDeTeste.id,
      expect.objectContaining({
        localId: equipamentoDeTeste.localId,
        tipoServico: 'preventiva',
        prioridade: 'alta',
        equipamentoIds: ['uti-1', 'uti-2'],
      }),
    );
    expect(abrirOrdem).toHaveBeenCalledWith(
      organizacaoDeTeste.id,
      expect.objectContaining({ localId: 'local-recepcao', equipamentoIds: ['rec-1'] }),
    );
  });

  it('"Marcar todos" marca só os do local que ainda não têm OS', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<Preventivas />, '/preventivas');

    const uti = (await screen.findByText(/Bloco B — UTI/)).closest(
      '[data-slot=card]',
    ) as HTMLElement;
    await usuario.click(within(uti).getByLabelText('Marcar todos'));

    expect(screen.getByLabelText('Incluir Split UTI 1')).toBeChecked();
    expect(screen.getByLabelText('Incluir Split UTI 2')).toBeChecked();
    expect(screen.getByLabelText('Incluir Split recepção')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Gerar 1 OS' })).toBeInTheDocument();
  });

  it('técnico consulta a lista, mas não gera OS', async () => {
    renderizarComRotas(<Preventivas />, '/preventivas', { organizacao: tecnico });
    expect(await screen.findByText('Vencida há 5 dias')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('sem nada vencendo, avisa', async () => {
    vi.mocked(listarEquipamentos).mockResolvedValue([emDia]);
    renderizarComRotas(<Preventivas />, '/preventivas');
    expect(
      await screen.findByText('Nenhuma preventiva vencida ou vencendo nos próximos 30 dias.'),
    ).toBeInTheDocument();
  });
});

describe('Painel', () => {
  it('cartão de preventivas conta só as sem OS aberta e leva à lista', async () => {
    vi.mocked(listarClientes).mockResolvedValue([]);
    renderizarComRotas(<Inicio />, '/');

    expect(await screen.findByRole('link', { name: /Preventivas vencendo\s*3/ })).toHaveAttribute(
      'href',
      '/preventivas',
    );
    expect(screen.getByText('Há preventivas vencidas sem OS aberta')).toBeInTheDocument();
  });
});
