import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDados } from '@/domain/erros';
import { ORDEM_FORMULARIO_VAZIO, ordemParaFormulario } from '@/domain/ordem/tipos';
import { ordemDeTeste } from '@/test/dados';
import { abrirOrdem, agendarOrdem, cancelarOrdem, editarOrdem } from './ordemService';

// O service só conhece a interface: aqui ela é trocada por uma versão falsa.
const repositorios = vi.hoisted(() => ({
  ordemRepository: {
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    abrir: vi.fn(),
    editar: vi.fn(),
    listarEventos: vi.fn(),
    agendar: vi.fn(),
    cancelar: vi.fn(),
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

  it('agendarOrdem manda o horário em ISO para o servidor', async () => {
    const tecnicoId = '00000000-0000-4000-8000-000000000003';
    await agendarOrdem(ordemDeTeste, {
      tecnicoId,
      data: '2026-10-22',
      hora: '14:00',
      duracaoMinutos: 90,
    });
    expect(repositorios.ordemRepository.agendar).toHaveBeenCalledWith(ordemDeTeste.id, {
      tecnicoId,
      agendadaPara: new Date(2026, 9, 22, 14).toISOString(),
      duracaoMinutos: 90,
    });
  });

  it('não agenda OS em execução nem cancela OS encerrada', async () => {
    const formulario = { tecnicoId: '', data: '', hora: '', duracaoMinutos: 60 };
    await expect(
      agendarOrdem({ ...ordemDeTeste, status: 'em_execucao' }, formulario),
    ).rejects.toThrow(/Pause antes de reagendar/);
    await expect(
      cancelarOrdem({ ...ordemDeTeste, status: 'concluida' }, { motivo: 'Qualquer motivo' }),
    ).rejects.toBeInstanceOf(ErroDados);
    expect(repositorios.ordemRepository.agendar).not.toHaveBeenCalled();
    expect(repositorios.ordemRepository.cancelar).not.toHaveBeenCalled();
  });

  it('cancelarOrdem manda o motivo sem espaços sobrando', async () => {
    await cancelarOrdem(ordemDeTeste, { motivo: '  Aberta em duplicidade ' });
    expect(repositorios.ordemRepository.cancelar).toHaveBeenCalledWith(
      ordemDeTeste.id,
      'Aberta em duplicidade',
    );
  });
});
