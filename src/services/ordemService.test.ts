import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDados } from '@/domain/erros';
import { ORDEM_FORMULARIO_VAZIO, ordemParaFormulario } from '@/domain/ordem/tipos';
import { ordemDeTeste } from '@/test/dados';
import { abrirOrdem, editarOrdem } from './ordemService';

// O service só conhece a interface: aqui ela é trocada por uma versão falsa.
const repositorios = vi.hoisted(() => ({
  ordemRepository: {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    abrir: vi.fn(),
    editar: vi.fn(),
    listarEventos: vi.fn(),
  },
}));

vi.mock('@/data', () => repositorios);

const organizacaoId = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ordemService', () => {
  it('abrirOrdem valida e grava os dados já normalizados', async () => {
    await abrirOrdem(organizacaoId, {
      ...ordemParaFormulario(ordemDeTeste),
      solicitante: '   ',
    });

    expect(repositorios.ordemRepository.abrir).toHaveBeenCalledWith(
      organizacaoId,
      expect.objectContaining({ solicitante: null, prioridade: 'alta' }),
    );
  });

  it('abrirOrdem recusa dados inválidos sem chamar o banco', async () => {
    await expect(abrirOrdem(organizacaoId, ORDEM_FORMULARIO_VAZIO)).rejects.toThrow();
    expect(repositorios.ordemRepository.abrir).not.toHaveBeenCalled();
  });

  it('editarOrdem recusa OS concluída ou cancelada antes de ir ao banco', async () => {
    const concluida = { ...ordemDeTeste, status: 'concluida' as const };

    await expect(editarOrdem(concluida, ordemParaFormulario(concluida))).rejects.toBeInstanceOf(
      ErroDados,
    );
    expect(repositorios.ordemRepository.editar).not.toHaveBeenCalled();
  });

  it('editarOrdem grava pelo id da OS', async () => {
    await editarOrdem(ordemDeTeste, { ...ordemParaFormulario(ordemDeTeste), prioridade: 'baixa' });
    expect(repositorios.ordemRepository.editar).toHaveBeenCalledWith(
      ordemDeTeste.id,
      expect.objectContaining({ prioridade: 'baixa' }),
    );
  });
});
