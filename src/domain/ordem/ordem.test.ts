import { describe, expect, it } from 'vitest';
import { equipamentoDeTeste, localDeTeste, ordemDeTeste } from '@/test/dados';
import {
  FILTRO_PADRAO,
  filtrarOrdens,
  filtroParaParametros,
  lerFiltro,
  SEM_TECNICO,
} from './filtros';
import { valoresComPreenchimento } from './preenchimento';
import {
  descreverEvento,
  ORDEM_FORMULARIO_VAZIO,
  OrdemFormularioSchema,
  type EventoOrdem,
} from './tipos';
import { podeEditarAbertura, podeTransitar, statusFinal } from './transicoes';

const clienteId = 'aaaaaaaa-0000-4000-8000-000000000001';
const localId = 'bbbbbbbb-0000-4000-8000-000000000001';
const equipamentoId = 'cccccccc-0000-4000-8000-000000000001';

describe('formulário de OS', () => {
  it('exige cliente, local e problema; o resto tem valor padrão', () => {
    const resultado = OrdemFormularioSchema.safeParse(ORDEM_FORMULARIO_VAZIO);
    expect(resultado.error?.issues.map((problema) => problema.message)).toEqual([
      'Escolha o cliente',
      'Escolha o local',
      'Informe o problema relatado',
    ]);
  });

  it('limpa espaços, troca solicitante vazio por null e tira equipamentos repetidos', () => {
    const dados = OrdemFormularioSchema.parse({
      ...ORDEM_FORMULARIO_VAZIO,
      clienteId,
      localId,
      problema: '  Não gela  ',
      equipamentoIds: [equipamentoId, equipamentoId],
    });
    expect(dados).toEqual({
      clienteId,
      localId,
      tipoServico: 'corretiva',
      prioridade: 'media',
      problema: 'Não gela',
      solicitante: null,
      equipamentoIds: [equipamentoId],
    });
  });
});

describe('transições de status (seção 4)', () => {
  it('segue o fluxo: aberta → agendada → em execução → concluída', () => {
    expect(podeTransitar('aberta', 'agendada')).toBe(true);
    expect(podeTransitar('agendada', 'em_execucao')).toBe(true);
    expect(podeTransitar('em_execucao', 'concluida')).toBe(true);
  });

  it('não pula etapas e não sai de concluída nem de cancelada', () => {
    expect(podeTransitar('aberta', 'concluida')).toBe(false);
    expect(podeTransitar('aberta', 'em_execucao')).toBe(false);
    expect(podeTransitar('concluida', 'aberta')).toBe(false);
    expect(podeTransitar('cancelada', 'agendada')).toBe(false);
  });

  it('cancela de qualquer etapa que ainda não terminou e permite reagendar', () => {
    for (const status of ['aberta', 'agendada', 'em_execucao', 'pausada'] as const) {
      expect(podeTransitar(status, 'cancelada'), status).toBe(true);
    }
    expect(podeTransitar('agendada', 'agendada')).toBe(true);
  });

  it('só edita a abertura enquanto a OS não terminou', () => {
    expect(statusFinal('concluida')).toBe(true);
    expect(podeEditarAbertura('aberta')).toBe(true);
    expect(podeEditarAbertura('pausada')).toBe(true);
    expect(podeEditarAbertura('cancelada')).toBe(false);
  });
});

describe('filtros da lista de OS', () => {
  const ordens = [
    { ...ordemDeTeste, id: '1', status: 'aberta' as const, criadoEm: '2026-10-01T15:00:00Z' },
    {
      ...ordemDeTeste,
      id: '2',
      status: 'agendada' as const,
      prioridade: 'urgente' as const,
      tecnicoId: 'tecnico-1',
      criadoEm: '2026-10-10T15:00:00Z',
    },
    { ...ordemDeTeste, id: '3', status: 'concluida' as const, criadoEm: '2026-10-15T15:00:00Z' },
  ];
  const ids = (filtro: Partial<typeof FILTRO_PADRAO>) =>
    filtrarOrdens(ordens, { ...FILTRO_PADRAO, ...filtro }).map((ordem) => ordem.id);

  it('por padrão mostra só as em andamento', () => {
    expect(ids({})).toEqual(['1', '2']);
    expect(ids({ situacao: 'todas' })).toEqual(['1', '2', '3']);
    expect(ids({ situacao: 'concluida' })).toEqual(['3']);
  });

  it('filtra por prioridade, técnico e período de abertura', () => {
    expect(ids({ prioridade: 'urgente' })).toEqual(['2']);
    expect(ids({ tecnicoId: 'tecnico-1' })).toEqual(['2']);
    expect(ids({ tecnicoId: SEM_TECNICO })).toEqual(['1']);
    expect(ids({ situacao: 'todas', abertaDe: '2026-10-05', abertaAte: '2026-10-15' })).toEqual([
      '2',
      '3',
    ]);
  });

  it('lê e grava o filtro no endereço, ignorando valores que não existem', () => {
    const filtro = lerFiltro(
      new URLSearchParams('situacao=pausada&prioridade=altissima&de=2026-10-01&ate=ontem'),
    );
    expect(filtro).toEqual({ ...FILTRO_PADRAO, situacao: 'pausada', abertaDe: '2026-10-01' });
    expect(filtroParaParametros(filtro).toString()).toBe('situacao=pausada&de=2026-10-01');
    expect(filtroParaParametros(FILTRO_PADRAO).toString()).toBe('');
  });
});

describe('preenchimento vindo de outra tela', () => {
  const cadastros = { locais: [localDeTeste], equipamentos: [equipamentoDeTeste] };

  it('vindo do equipamento, já escolhe cliente, local e o próprio equipamento', () => {
    const valores = valoresComPreenchimento(
      ORDEM_FORMULARIO_VAZIO,
      { equipamentoId: equipamentoDeTeste.id },
      cadastros,
    );
    expect(valores).toMatchObject({
      clienteId: equipamentoDeTeste.clienteId,
      localId: equipamentoDeTeste.localId,
      equipamentoIds: [equipamentoDeTeste.id],
    });
  });

  it('vindo do cliente com um local só, já escolhe o local', () => {
    const valores = valoresComPreenchimento(
      ORDEM_FORMULARIO_VAZIO,
      { clienteId: localDeTeste.clienteId },
      cadastros,
    );
    expect(valores).toMatchObject({ clienteId: localDeTeste.clienteId, localId: localDeTeste.id });
  });
});

describe('histórico', () => {
  const base: EventoOrdem = {
    id: '1',
    tipo: 'abertura',
    statusAnterior: null,
    statusNovo: 'aberta',
    descricao: null,
    usuarioNome: 'Ana',
    criadoEm: '2026-10-20T13:30:00Z',
  };

  it('descreve cada tipo de evento numa frase curta', () => {
    expect(descreverEvento(base)).toBe('OS aberta');
    expect(descreverEvento({ ...base, tipo: 'edicao', descricao: 'Alterado: prioridade' })).toBe(
      'Alterado: prioridade',
    );
    expect(
      descreverEvento({
        ...base,
        tipo: 'mudanca_status',
        statusAnterior: 'aberta',
        statusNovo: 'agendada',
      }),
    ).toBe('Status: Aberta → Agendada');
  });
});
