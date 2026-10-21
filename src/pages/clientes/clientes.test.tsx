import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDados } from '@/domain/erros';
import {
  criarCliente,
  criarLocal,
  buscarCliente,
  listarClientes,
  listarLocaisDoCliente,
} from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { clienteDeTeste, equipamentoDeTeste, localDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas } from '@/test/renderizar';
import { DetalheCliente } from './DetalheCliente';
import { ListaClientes } from './ListaClientes';
import { NovoCliente } from './NovoCliente';

vi.mock('@/services/clienteService');
vi.mock('@/services/equipamentoService');

const tecnico = { ...organizacaoDeTeste, papeis: ['tecnico' as const] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Lista de clientes', () => {
  const arquivado = { ...clienteDeTeste, id: 'c2', nome: 'Padaria Antiga', ativo: false };
  const clinica = { ...clienteDeTeste, id: 'c3', nome: 'Clínica Vida', documento: null };

  beforeEach(() => {
    vi.mocked(listarClientes).mockResolvedValue([clinica, clienteDeTeste, arquivado]);
  });

  it('lista os ativos e esconde os arquivados', async () => {
    renderizarComRotas(<ListaClientes />, '/clientes');

    expect(await screen.findByText('Hospital São Lucas')).toBeInTheDocument();
    expect(screen.getByText('Clínica Vida')).toBeInTheDocument();
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(screen.queryByText('Padaria Antiga')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByLabelText('Mostrar arquivados'));
    expect(screen.getByText('Padaria Antiga')).toBeInTheDocument();
  });

  it('busca sem diferenciar acentos e também pelo CNPJ', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<ListaClientes />, '/clientes');
    const busca = await screen.findByRole('searchbox');

    await usuario.type(busca, 'clinica');
    expect(screen.getByText('Clínica Vida')).toBeInTheDocument();
    expect(screen.queryByText('Hospital São Lucas')).not.toBeInTheDocument();

    await usuario.clear(busca);
    await usuario.type(busca, '11222333');
    expect(screen.getByText('Hospital São Lucas')).toBeInTheDocument();
    expect(screen.queryByText('Clínica Vida')).not.toBeInTheDocument();
  });

  it('clicar na linha abre o cliente', async () => {
    renderizarComRotas(<ListaClientes />, '/clientes', {
      outrasRotas: { '/clientes/:id': <p>Detalhe</p> },
    });

    await userEvent.setup().click(await screen.findByLabelText('Abrir Hospital São Lucas'));

    expect(screen.getByTestId('endereco')).toHaveTextContent(`/clientes/${clienteDeTeste.id}`);
  });

  it('técnico não vê o botão de novo cliente', async () => {
    renderizarComRotas(<ListaClientes />, '/clientes', { organizacao: tecnico });

    expect(await screen.findByText('Hospital São Lucas')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /novo cliente/i })).not.toBeInTheDocument();
  });
});

describe('Novo cliente', () => {
  async function preencherEEnviar(nome: string, documento: string) {
    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('Razão social ou nome fantasia'), nome);
    await usuario.type(screen.getByLabelText('CNPJ'), documento);
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));
  }

  it('valida o CNPJ antes de salvar', async () => {
    renderizarComRotas(<NovoCliente />, '/clientes/novo');

    await preencherEEnviar('Hospital São Lucas', '11.222.333/0001-82');

    expect(await screen.findByText('CNPJ inválido')).toBeInTheDocument();
    expect(criarCliente).not.toHaveBeenCalled();
  });

  it('cadastra e abre a tela do cliente para adicionar os locais', async () => {
    vi.mocked(criarCliente).mockResolvedValue(clienteDeTeste);
    renderizarComRotas(<NovoCliente />, '/clientes/novo', {
      outrasRotas: { '/clientes/:id': <p>Detalhe do cliente</p> },
    });

    await preencherEEnviar('Hospital São Lucas', '11.222.333/0001-81');

    expect(await screen.findByText('Detalhe do cliente')).toBeInTheDocument();
    expect(criarCliente).toHaveBeenCalledWith(
      organizacaoDeTeste.id,
      expect.objectContaining({ nome: 'Hospital São Lucas', documento: '11.222.333/0001-81' }),
    );
  });

  it('mostra no campo quando o CNPJ já está cadastrado', async () => {
    vi.mocked(criarCliente).mockRejectedValue(
      new ErroDados('duplicado', {
        campo: 'documento',
        mensagem: 'Já existe um cliente com este CPF/CNPJ.',
      }),
    );
    renderizarComRotas(<NovoCliente />, '/clientes/novo');

    await preencherEEnviar('Hospital São Lucas', '11.222.333/0001-81');

    expect(await screen.findByText('Já existe um cliente com este CPF/CNPJ.')).toBeInTheDocument();
    expect(screen.getByLabelText('CNPJ')).toHaveAttribute('aria-invalid', 'true');
  });

  it('pessoa física pede CPF e nome completo', async () => {
    renderizarComRotas(<NovoCliente />, '/clientes/novo');

    await userEvent.setup().selectOptions(screen.getByLabelText('Tipo'), 'fisica');

    expect(screen.getByLabelText('CPF')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });
});

describe('Detalhe do cliente', () => {
  beforeEach(() => {
    vi.mocked(buscarCliente).mockResolvedValue(clienteDeTeste);
    vi.mocked(listarLocaisDoCliente).mockResolvedValue([localDeTeste]);
    vi.mocked(listarEquipamentos).mockResolvedValue([equipamentoDeTeste]);
  });

  it('mostra os dados, os locais e os equipamentos do cliente', async () => {
    renderizarComRotas(<DetalheCliente />, '/clientes/:id', {
      rota: `/clientes/${clienteDeTeste.id}`,
    });

    expect(await screen.findByRole('heading', { name: 'Hospital São Lucas' })).toBeInTheDocument();
    expect(screen.getByText('(35) 99999-8888')).toBeInTheDocument();
    expect(await screen.findByText('Bloco B — UTI')).toBeInTheDocument();
    expect(screen.getByText(/Passos\/MG/)).toBeInTheDocument();
    expect(await screen.findByText('Split UTI leito 3')).toBeInTheDocument();
    expect(listarEquipamentos).toHaveBeenCalledWith(organizacaoDeTeste.id, {
      clienteId: clienteDeTeste.id,
    });
  });

  it('cadastra um local pelo diálogo', async () => {
    vi.mocked(criarLocal).mockResolvedValue({ ...localDeTeste, id: 'novo', nome: 'Recepção' });
    const usuario = userEvent.setup();
    renderizarComRotas(<DetalheCliente />, '/clientes/:id', {
      rota: `/clientes/${clienteDeTeste.id}`,
    });

    await usuario.click(await screen.findByRole('button', { name: 'Novo local' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText('Nome do local'), 'Recepção');
    await usuario.selectOptions(within(dialogo).getByLabelText('UF'), 'MG');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar local' }));

    expect(await screen.findByText('Local cadastrado.')).toBeInTheDocument();
    expect(criarLocal).toHaveBeenCalledWith(
      organizacaoDeTeste.id,
      clienteDeTeste.id,
      expect.objectContaining({ nome: 'Recepção', uf: 'MG' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('técnico só consulta: sem editar, arquivar ou novo local', async () => {
    renderizarComRotas(<DetalheCliente />, '/clientes/:id', {
      rota: `/clientes/${clienteDeTeste.id}`,
      organizacao: tecnico,
    });

    expect(await screen.findByText('Bloco B — UTI')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arquivar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo local' })).not.toBeInTheDocument();
  });

  it('avisa quando o cliente não existe', async () => {
    vi.mocked(buscarCliente).mockResolvedValue(null);
    renderizarComRotas(<DetalheCliente />, '/clientes/:id', { rota: '/clientes/nao-existe' });

    expect(await screen.findByText('Cliente não encontrado')).toBeInTheDocument();
  });
});
