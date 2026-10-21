import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIENTE_FORMULARIO_VAZIO } from '@/domain/cliente/tipos';
import { EQUIPAMENTO_FORMULARIO_VAZIO } from '@/domain/equipamento/tipos';
import { arquivarCliente, criarCliente } from './clienteService';
import { criarEquipamento } from './equipamentoService';

// Os services só conhecem as interfaces: aqui elas são trocadas por versões falsas.
const repositorios = vi.hoisted(() => ({
  clienteRepository: {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    definirAtivo: vi.fn(),
  },
  localRepository: {
    listar: vi.fn(),
    listarPorCliente: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    definirAtivo: vi.fn(),
  },
  equipamentoRepository: {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    definirAtivo: vi.fn(),
  },
}));

vi.mock('@/data', () => repositorios);

const organizacaoId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('services de cadastro', () => {
  it('criarCliente valida e grava os dados já normalizados', async () => {
    await criarCliente(organizacaoId, {
      ...CLIENTE_FORMULARIO_VAZIO,
      nome: 'Hospital São Lucas',
      documento: '11.222.333/0001-81',
    });

    expect(repositorios.clienteRepository.criar).toHaveBeenCalledWith(
      organizacaoId,
      expect.objectContaining({ documento: '11222333000181', email: null }),
    );
  });

  it('criarCliente recusa dados inválidos sem chamar o banco', async () => {
    await expect(criarCliente(organizacaoId, CLIENTE_FORMULARIO_VAZIO)).rejects.toThrow();
    expect(repositorios.clienteRepository.criar).not.toHaveBeenCalled();
  });

  it('criarEquipamento converte os números antes de gravar', async () => {
    await criarEquipamento(organizacaoId, {
      ...EQUIPAMENTO_FORMULARIO_VAZIO,
      localId: 'bbbbbbbb-0000-4000-8000-000000000001',
      identificacao: 'Split Sala 2',
      capacidadeBtu: '12000',
    });

    expect(repositorios.equipamentoRepository.criar).toHaveBeenCalledWith(
      organizacaoId,
      expect.objectContaining({ capacidadeBtu: 12000, periodicidadeDias: null }),
    );
  });

  it('arquivar não apaga: só marca como inativo', async () => {
    await arquivarCliente('cliente-1');
    expect(repositorios.clienteRepository.definirAtivo).toHaveBeenCalledWith('cliente-1', false);
  });
});
