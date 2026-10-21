import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarClientes, listarLocais } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import {
  abrirOrdem,
  buscarOrdem,
  listarEventosDaOrdem,
  listarOrdens,
} from '@/services/ordemService';
import { listarMembros } from '@/services/organizacaoService';
import { clienteDeTeste, equipamentoDeTeste, localDeTeste, ordemDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas } from '@/test/renderizar';
import { DetalheOrdem } from './DetalheOrdem';
import { EditarOrdem } from './EditarOrdem';
import { ListaOrdens } from './ListaOrdens';
import { NovaOrdem } from './NovaOrdem';

vi.mock('@/services/clienteService');
vi.mock('@/services/equipamentoService');
vi.mock('@/services/ordemService');
vi.mock('@/services/organizacaoService');

const tecnico = {
  usuarioId: '00000000-0000-4000-8000-000000000003',
  nome: 'João Técnico',
  papeis: ['tecnico' as const],
  ativo: true,
};
const tecnicoNaEmpresa = { ...organizacaoDeTeste, papeis: ['tecnico' as const] };

const segundoLocal = {
  ...localDeTeste,
  id: 'bbbbbbbb-0000-4000-8000-000000000002',
  nome: 'Recepção',
};
const equipamentoDaRecepcao = {
  ...equipamentoDeTeste,
  id: 'cccccccc-0000-4000-8000-000000000002',
  identificacao: 'Split Recepção',
  patrimonio: null,
  localId: segundoLocal.id,
  localNome: segundoLocal.nome,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarClientes).mockResolvedValue([clienteDeTeste]);
  vi.mocked(listarLocais).mockResolvedValue([localDeTeste, segundoLocal]);
  vi.mocked(listarEquipamentos).mockResolvedValue([equipamentoDeTeste, equipamentoDaRecepcao]);
  vi.mocked(listarMembros).mockResolvedValue([tecnico]);
  vi.mocked(listarEventosDaOrdem).mockResolvedValue([]);
});

describe('Lista de OS', () => {
  const urgente = {
    ...ordemDeTeste,
    id: 'o2',
    numero: 8,
    prioridade: 'urgente' as const,
    clienteNome: 'Padaria Pão Bom',
    problema: 'Câmara fria parou',
    tecnicoId: tecnico.usuarioId,
    tecnicoNome: tecnico.nome,
  };
  const concluida = { ...ordemDeTeste, id: 'o3', numero: 3, status: 'concluida' as const };

  beforeEach(() => {
    vi.mocked(listarOrdens).mockResolvedValue([urgente, ordemDeTeste, concluida]);
  });

  it('por padrão mostra só as OS em andamento, com status e prioridade', async () => {
    renderizarComRotas(<ListaOrdens />, '/ordens');

    expect(await screen.findByText('OS 8')).toBeInTheDocument();
    expect(screen.getByText('OS 7')).toBeInTheDocument();
    expect(screen.queryByText('OS 3')).not.toBeInTheDocument();
    const tabela = within(screen.getByRole('table'));
    expect(tabela.getByText('Urgente')).toBeInTheDocument();
    expect(tabela.getAllByText('Aberta')).toHaveLength(2);
  });

  it('o filtro fica no endereço e "Limpar filtros" volta ao padrão', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<ListaOrdens />, '/ordens');
    await screen.findByText('OS 8');

    await usuario.selectOptions(screen.getByLabelText('Situação'), 'todas');
    await usuario.selectOptions(screen.getByLabelText('Técnico'), tecnico.usuarioId);

    expect(screen.getByTestId('endereco')).toHaveTextContent(
      `/ordens?situacao=todas&tecnico=${tecnico.usuarioId}`,
    );
    expect(screen.getByText('OS 8')).toBeInTheDocument();
    expect(screen.queryByText('OS 7')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByTestId('endereco')).toHaveTextContent(/^\/ordens$/);
  });

  it('abre já filtrada pelo endereço (ex.: cartão do painel)', async () => {
    renderizarComRotas(<ListaOrdens />, '/ordens', { rota: '/ordens?prioridade=urgente' });

    expect(await screen.findByText('OS 8')).toBeInTheDocument();
    expect(screen.queryByText('OS 7')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prioridade')).toHaveValue('urgente');
  });

  it('busca pelo número e pelo problema', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<ListaOrdens />, '/ordens');
    const busca = await screen.findByRole('searchbox');

    await usuario.type(busca, 'camara fria');
    expect(screen.getByText('OS 8')).toBeInTheDocument();
    expect(screen.queryByText('OS 7')).not.toBeInTheDocument();

    await usuario.clear(busca);
    await usuario.type(busca, 'os 7');
    expect(screen.getByText('OS 7')).toBeInTheDocument();
    expect(screen.queryByText('OS 8')).not.toBeInTheDocument();
  });

  it('técnico não vê "Nova OS" nem o filtro por técnico', async () => {
    renderizarComRotas(<ListaOrdens />, '/ordens', { organizacao: tecnicoNaEmpresa });

    await screen.findByText('OS 8');
    expect(screen.queryByRole('link', { name: /Nova OS/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument();
    expect(listarMembros).not.toHaveBeenCalled();
  });
});

describe('Nova OS', () => {
  it('abre a OS com os dados preenchidos e vai para o detalhe', async () => {
    vi.mocked(abrirOrdem).mockResolvedValue(ordemDeTeste);
    const usuario = userEvent.setup();
    renderizarComRotas(<NovaOrdem />, '/ordens/nova', {
      outrasRotas: { '/ordens/:id': <p>Detalhe da OS</p> },
    });

    // Cliente com dois locais: o local ainda precisa ser escolhido.
    await usuario.selectOptions(await screen.findByLabelText('Cliente'), clienteDeTeste.id);
    expect(screen.getByLabelText('Local')).toHaveValue('');
    await usuario.selectOptions(screen.getByLabelText('Local'), localDeTeste.id);
    await usuario.click(screen.getByLabelText(/Split UTI leito 3/));
    await usuario.selectOptions(screen.getByLabelText('Prioridade'), 'urgente');
    await usuario.type(screen.getByLabelText('Problema relatado'), 'Pingando água');
    await usuario.click(screen.getByRole('button', { name: 'Abrir OS' }));

    expect(await screen.findByText('Detalhe da OS')).toBeInTheDocument();
    expect(abrirOrdem).toHaveBeenCalledWith(organizacaoDeTeste.id, {
      clienteId: clienteDeTeste.id,
      localId: localDeTeste.id,
      tipoServico: 'corretiva',
      prioridade: 'urgente',
      problema: 'Pingando água',
      solicitante: '',
      equipamentoIds: [equipamentoDeTeste.id],
    });
    expect(await screen.findByText('OS 7 aberta.')).toBeInTheDocument();
  });

  it('mostra só os equipamentos do local escolhido e desmarca ao trocar de local', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<NovaOrdem />, '/ordens/nova', {
      rota: `/ordens/nova?equipamentoId=${equipamentoDeTeste.id}`,
    });

    // Vindo do equipamento, cliente, local e equipamento já chegam escolhidos.
    const marcado = await screen.findByLabelText(/Split UTI leito 3/);
    expect(marcado).toBeChecked();
    expect(screen.getByLabelText('Local')).toHaveValue(localDeTeste.id);
    expect(screen.queryByLabelText(/Split Recepção/)).not.toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Local'), segundoLocal.id);

    expect(screen.getByLabelText(/Split Recepção/)).not.toBeChecked();
    expect(screen.queryByLabelText(/Split UTI leito 3/)).not.toBeInTheDocument();
  });

  it('não abre sem cliente, local e problema', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<NovaOrdem />, '/ordens/nova');

    await usuario.click(await screen.findByRole('button', { name: 'Abrir OS' }));

    const erros = (await screen.findAllByRole('alert')).map((erro) => erro.textContent);
    expect(erros).toEqual(
      expect.arrayContaining([
        'Escolha o cliente',
        'Escolha o local',
        'Informe o problema relatado',
      ]),
    );
    expect(abrirOrdem).not.toHaveBeenCalled();
  });

  it('técnico não abre OS', () => {
    renderizarComRotas(<NovaOrdem />, '/ordens/nova', { organizacao: tecnicoNaEmpresa });
    expect(screen.getByText('Você não pode abrir OS')).toBeInTheDocument();
  });
});

describe('Detalhe da OS', () => {
  it('mostra cliente, equipamentos, problema e histórico', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(ordemDeTeste);
    vi.mocked(listarEventosDaOrdem).mockResolvedValue([
      {
        id: 'e1',
        tipo: 'abertura',
        statusAnterior: null,
        statusNovo: 'aberta',
        descricao: null,
        usuarioNome: 'Gestor Teste',
        criadoEm: ordemDeTeste.criadoEm,
      },
    ]);
    renderizarComRotas(<DetalheOrdem />, '/ordens/:id', { rota: `/ordens/${ordemDeTeste.id}` });

    expect(await screen.findByRole('heading', { name: 'OS 7' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: clienteDeTeste.nome })).toHaveAttribute(
      'href',
      `/clientes/${clienteDeTeste.id}`,
    );
    expect(screen.getByRole('link', { name: 'Split UTI leito 3' })).toBeInTheDocument();
    expect(screen.getByText(ordemDeTeste.problema)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Editar/ })).toBeInTheDocument();

    const historico = (await screen.findByText('OS aberta')).closest('li') as HTMLElement;
    expect(within(historico).getByText(/Gestor Teste/)).toBeInTheDocument();
  });

  it('OS concluída e técnico não têm o botão Editar', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue({ ...ordemDeTeste, status: 'concluida' });
    const primeira = renderizarComRotas(<DetalheOrdem />, '/ordens/:id', {
      rota: `/ordens/${ordemDeTeste.id}`,
    });
    expect(await screen.findByText('Concluída')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
    primeira.unmount();

    vi.mocked(buscarOrdem).mockResolvedValue(ordemDeTeste);
    renderizarComRotas(<DetalheOrdem />, '/ordens/:id', {
      rota: `/ordens/${ordemDeTeste.id}`,
      organizacao: tecnicoNaEmpresa,
    });
    expect(await screen.findByRole('heading', { name: 'OS 7' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
  });

  it('OS que não existe (ou de outro técnico) mostra "não encontrada"', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(null);
    renderizarComRotas(<DetalheOrdem />, '/ordens/:id', { rota: '/ordens/qualquer' });
    expect(await screen.findByText('Ordem de serviço não encontrada')).toBeInTheDocument();
  });
});

describe('Editar OS', () => {
  it('abre o formulário com os dados atuais', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(ordemDeTeste);
    renderizarComRotas(<EditarOrdem />, '/ordens/:id/editar', {
      rota: `/ordens/${ordemDeTeste.id}/editar`,
    });

    expect(await screen.findByLabelText('Problema relatado')).toHaveValue(ordemDeTeste.problema);
    expect(screen.getByLabelText('Prioridade')).toHaveValue('alta');
    expect(screen.getByLabelText(/Split UTI leito 3/)).toBeChecked();
  });

  it('OS cancelada não abre o formulário', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue({ ...ordemDeTeste, status: 'cancelada' });
    renderizarComRotas(<EditarOrdem />, '/ordens/:id/editar', {
      rota: `/ordens/${ordemDeTeste.id}/editar`,
    });

    expect(await screen.findByText('Esta OS não pode ser editada')).toBeInTheDocument();
    expect(screen.queryByLabelText('Problema relatado')).not.toBeInTheDocument();
  });
});
