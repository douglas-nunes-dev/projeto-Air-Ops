import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listarClientes, listarLocais } from '@/services/clienteService';
import {
  buscarEquipamento,
  criarEquipamento,
  listarEquipamentos,
} from '@/services/equipamentoService';
import { clienteDeTeste, equipamentoDeTeste, localDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas } from '@/test/renderizar';
import { DetalheEquipamento } from './DetalheEquipamento';
import { ListaEquipamentos } from './ListaEquipamentos';
import { NovoEquipamento } from './NovoEquipamento';

vi.mock('@/services/clienteService');
vi.mock('@/services/equipamentoService');

const outroCliente = { ...clienteDeTeste, id: 'cliente-2', nome: 'Padaria Pão Bom' };
const locaisDoOutro = [
  { ...localDeTeste, id: 'local-2a', clienteId: outroCliente.id, nome: 'Loja' },
  { ...localDeTeste, id: 'local-2b', clienteId: outroCliente.id, nome: 'Câmara fria — fundos' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Lista de equipamentos', () => {
  const camara = {
    ...equipamentoDeTeste,
    id: 'e2',
    identificacao: 'Câmara fria',
    tipo: 'camara_fria' as const,
    patrimonio: null,
    capacidadeBtu: null,
    clienteNome: 'Padaria Pão Bom',
    localNome: 'Fundos',
    periodicidadeDias: 90,
  };

  beforeEach(() => {
    vi.mocked(listarEquipamentos).mockResolvedValue([equipamentoDeTeste, camara]);
  });

  it('mostra tipo, cliente, capacidade e periodicidade', async () => {
    renderizarComRotas(<ListaEquipamentos />, '/equipamentos');

    expect(await screen.findByText('Split UTI leito 3')).toBeInTheDocument();
    expect(screen.getByText('PAT-0042')).toBeInTheDocument();
    expect(screen.getByText('18.000 BTU/h')).toBeInTheDocument();
    expect(screen.getByText('Mensal')).toBeInTheDocument();
    expect(screen.getByText('Trimestral')).toBeInTheDocument();
    expect(screen.getAllByText('Câmara fria')).toHaveLength(2); // identificação e tipo
  });

  it('busca pelo patrimônio e pelo nome do cliente', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<ListaEquipamentos />, '/equipamentos');
    const busca = await screen.findByRole('searchbox');

    await usuario.type(busca, 'pat-0042');
    expect(screen.getByText('Split UTI leito 3')).toBeInTheDocument();
    expect(screen.queryByText('Padaria Pão Bom')).not.toBeInTheDocument();

    await usuario.clear(busca);
    await usuario.type(busca, 'padaria');
    expect(screen.getByText('Padaria Pão Bom')).toBeInTheDocument();
    expect(screen.queryByText('Split UTI leito 3')).not.toBeInTheDocument();
  });
});

describe('Novo equipamento', () => {
  beforeEach(() => {
    vi.mocked(listarClientes).mockResolvedValue([clienteDeTeste, outroCliente]);
    vi.mocked(listarLocais).mockResolvedValue([localDeTeste, ...locaisDoOutro]);
  });

  it('o local só libera depois do cliente e mostra só os locais dele', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<NovoEquipamento />, '/equipamentos/novo');

    const local = await screen.findByLabelText('Local');
    expect(local).toBeDisabled();

    await usuario.selectOptions(screen.getByLabelText('Cliente'), outroCliente.id);

    expect(local).toBeEnabled();
    const nomes = Array.from((local as HTMLSelectElement).options).map((opcao) => opcao.text);
    expect(nomes).toEqual(['Escolha o local', 'Loja', 'Câmara fria — fundos']);
  });

  it('vindo da tela do cliente, já chega com cliente e o único local escolhidos', async () => {
    vi.mocked(criarEquipamento).mockResolvedValue(equipamentoDeTeste);
    const usuario = userEvent.setup();
    renderizarComRotas(<NovoEquipamento />, '/equipamentos/novo', {
      rota: `/equipamentos/novo?clienteId=${clienteDeTeste.id}`,
      outrasRotas: { '/equipamentos/:id': <p>Detalhe do equipamento</p> },
    });

    expect(await screen.findByLabelText('Cliente')).toHaveValue(clienteDeTeste.id);
    // Quando o cliente vem pronto, o local ainda precisa ser escolhido (pode haver vários).
    await usuario.selectOptions(screen.getByLabelText('Local'), localDeTeste.id);
    await usuario.type(screen.getByLabelText('Identificação'), 'Split Sala 2');
    await usuario.type(screen.getByLabelText('Capacidade (BTU/h)'), '12000');
    await usuario.selectOptions(screen.getByLabelText('Periodicidade'), '90');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar equipamento' }));

    expect(await screen.findByText('Detalhe do equipamento')).toBeInTheDocument();
    expect(criarEquipamento).toHaveBeenCalledWith(
      organizacaoDeTeste.id,
      expect.objectContaining({
        localId: localDeTeste.id,
        identificacao: 'Split Sala 2',
        capacidadeBtu: '12000',
        periodicidadeDias: '90',
      }),
    );
  });

  it('escolher um cliente com um local só já preenche o local', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<NovoEquipamento />, '/equipamentos/novo');

    await usuario.selectOptions(await screen.findByLabelText('Cliente'), clienteDeTeste.id);

    expect(screen.getByLabelText('Local')).toHaveValue(localDeTeste.id);
  });

  it('não salva sem local e identificação', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<NovoEquipamento />, '/equipamentos/novo');

    await usuario.click(await screen.findByRole('button', { name: 'Cadastrar equipamento' }));

    expect(await screen.findByText('Escolha o local')).toBeInTheDocument();
    expect(screen.getByText('Informe a identificação')).toBeInTheDocument();
    expect(criarEquipamento).not.toHaveBeenCalled();
  });
});

describe('Detalhe do equipamento', () => {
  it('mostra dados técnicos, onde fica e a preventiva', async () => {
    vi.mocked(buscarEquipamento).mockResolvedValue(equipamentoDeTeste);
    renderizarComRotas(<DetalheEquipamento />, '/equipamentos/:id', {
      rota: `/equipamentos/${equipamentoDeTeste.id}`,
    });

    expect(await screen.findByRole('heading', { name: 'Split UTI leito 3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hospital São Lucas' })).toHaveAttribute(
      'href',
      `/clientes/${clienteDeTeste.id}`,
    );
    expect(screen.getByText('Springer')).toBeInTheDocument();
    expect(screen.getByText('15/03/2024')).toBeInTheDocument();
    expect(screen.getByText('Mensal')).toBeInTheDocument();
  });
});
