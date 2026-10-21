import { describe, expect, it } from 'vitest';
import {
  decidir,
  formatarHorario,
  lerPedido,
  type OrdemAtual,
  type Pedido,
  type Vinculo,
} from '../functions/alterar-status-ordem/regras.ts';

// Regras da Edge Function "alterar-status-ordem", testadas sem Deno nem banco.
const ordemId = 'dddddddd-0000-4000-8000-000000000001';
const tecnicoId = '00000000-0000-4000-8000-000000000003';
const gestorId = '00000000-0000-4000-8000-000000000002';

const gestor: Vinculo = { papeis: ['gestor'], ativo: true, nome: 'Gestor' };
const tecnico: Vinculo = { papeis: ['tecnico'], ativo: true, nome: 'João' };
const aberta: OrdemAtual = {
  status: 'aberta',
  tecnicoId: null,
  agendadaPara: null,
  duracaoMinutos: 60,
};

const agendar: Pedido = {
  acao: 'agendar',
  ordemId,
  tecnicoId,
  agendadaPara: '2026-10-22T13:00:00.000Z',
  duracaoMinutos: 90,
};
const cancelar: Pedido = { acao: 'cancelar', ordemId, motivo: 'Cliente desistiu' };

function contexto(mudancas: Partial<Parameters<typeof decidir>[0]> = {}) {
  return {
    pedido: agendar,
    usuarioId: gestorId,
    ordem: aberta,
    quemPede: gestor,
    tecnico,
    ...mudancas,
  };
}

describe('lerPedido', () => {
  it('aceita um agendamento completo e padroniza a data', () => {
    const leitura = lerPedido({ ...agendar, agendadaPara: '2026-10-22T10:00:00-03:00' });
    expect(leitura).toEqual({
      ok: true,
      pedido: { ...agendar, agendadaPara: '2026-10-22T13:00:00.000Z' },
    });
  });

  it('recusa técnico, data e duração inválidos, apontando o campo', () => {
    expect(lerPedido({ ...agendar, tecnicoId: 'x' })).toMatchObject({ campo: 'tecnicoId' });
    expect(lerPedido({ ...agendar, agendadaPara: 'amanhã' })).toMatchObject({ campo: 'data' });
    expect(lerPedido({ ...agendar, duracaoMinutos: 5 })).toMatchObject({ campo: 'duracaoMinutos' });
    expect(lerPedido({ ...agendar, duracaoMinutos: 1000 })).toMatchObject({
      campo: 'duracaoMinutos',
    });
  });

  it('cancelar exige motivo; ação desconhecida é recusada', () => {
    expect(lerPedido({ ...cancelar, motivo: '  ok ' })).toMatchObject({ campo: 'motivo' });
    expect(lerPedido({ ...cancelar, motivo: '  Cliente desistiu  ' })).toEqual({
      ok: true,
      pedido: cancelar,
    });
    expect(lerPedido({ acao: 'concluir', ordemId })).toMatchObject({ ok: false });
    expect(lerPedido(null)).toMatchObject({ ok: false });
  });
});

describe('decidir', () => {
  it('agenda uma OS aberta e descreve no horário de Brasília', () => {
    const decisao = decidir(contexto());
    expect(decisao).toEqual({
      ok: true,
      gravacao: {
        p_ordem_id: ordemId,
        p_status_esperado: 'aberta',
        p_status_novo: 'agendada',
        p_tecnico_id: tecnicoId,
        p_agendada_para: agendar.agendadaPara,
        p_duracao_minutos: 90,
        p_motivo_cancelamento: null,
        p_tipo_evento: 'mudanca_status',
        p_descricao: 'Agendada para qui., 22/10 às 10:00 — João',
        p_usuario_id: gestorId,
      },
    });
  });

  it('agendar de novo uma OS agendada é reagendamento', () => {
    const decisao = decidir(contexto({ ordem: { ...aberta, status: 'agendada' } }));
    expect(decisao).toMatchObject({
      ok: true,
      gravacao: { p_tipo_evento: 'reagendamento', p_status_esperado: 'agendada' },
    });
    if (decisao.ok) expect(decisao.gravacao.p_descricao).toMatch(/^Reagendada para/);
  });

  it('só admin e gestor ativos planejam; quem é de fora nem vê a OS', () => {
    expect(decidir(contexto({ quemPede: tecnico }))).toMatchObject({ codigo: 'sem_permissao' });
    expect(decidir(contexto({ quemPede: null }))).toMatchObject({ codigo: 'nao_encontrado' });
    expect(decidir(contexto({ quemPede: { ...gestor, ativo: false } }))).toMatchObject({
      codigo: 'nao_encontrado',
    });
    expect(decidir(contexto({ ordem: null }))).toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('o escolhido precisa ser técnico ativo da empresa', () => {
    expect(decidir(contexto({ tecnico: gestor }))).toMatchObject({ campo: 'tecnicoId' });
    expect(decidir(contexto({ tecnico: null }))).toMatchObject({ campo: 'tecnicoId' });
    expect(decidir(contexto({ tecnico: { ...tecnico, ativo: false } }))).toMatchObject({
      campo: 'tecnicoId',
    });
  });

  it('segue as transições da seção 4', () => {
    for (const status of ['em_execucao', 'concluida', 'cancelada'] as const) {
      expect(decidir(contexto({ ordem: { ...aberta, status } })), status).toMatchObject({
        codigo: 'transicao_invalida',
      });
    }
    expect(decidir(contexto({ ordem: { ...aberta, status: 'pausada' } }))).toMatchObject({
      ok: true,
    });
  });

  it('cancela guardando o motivo e o que estava planejado', () => {
    const agendada: OrdemAtual = {
      status: 'agendada',
      tecnicoId,
      agendadaPara: agendar.agendadaPara,
      duracaoMinutos: 90,
    };
    expect(decidir(contexto({ pedido: cancelar, ordem: agendada }))).toMatchObject({
      ok: true,
      gravacao: {
        p_status_novo: 'cancelada',
        p_tecnico_id: tecnicoId,
        p_motivo_cancelamento: 'Cliente desistiu',
        p_descricao: 'Motivo: Cliente desistiu',
      },
    });
    expect(
      decidir(contexto({ pedido: cancelar, ordem: { ...aberta, status: 'concluida' } })),
    ).toMatchObject({ codigo: 'transicao_invalida' });
  });
});

describe('formatarHorario', () => {
  it('usa o horário da empresa, não o do servidor', () => {
    expect(formatarHorario('2026-10-23T02:30:00Z')).toBe('qui., 22/10 às 23:30');
  });
});

describe('execução (etapa 4)', () => {
  const iniciar: Pedido = { acao: 'iniciar', ordemId };
  const pausar: Pedido = { acao: 'pausar', ordemId, motivo: 'Aguardando peça' };
  const agendada: OrdemAtual = {
    status: 'agendada',
    tecnicoId,
    agendadaPara: '2026-10-22T13:00:00.000Z',
    duracaoMinutos: 60,
  };
  const doTecnico = { usuarioId: tecnicoId, quemPede: tecnico, ordem: agendada };

  it('lerPedido aceita iniciar e exige o motivo da pausa', () => {
    expect(lerPedido(iniciar)).toEqual({ ok: true, pedido: iniciar });
    expect(lerPedido(pausar)).toEqual({ ok: true, pedido: pausar });
    expect(lerPedido({ ...pausar, motivo: 'ok' })).toMatchObject({ ok: false, campo: 'motivo' });
  });

  it('o técnico da OS inicia, mantendo o que foi planejado', () => {
    expect(decidir(contexto({ pedido: iniciar, ...doTecnico }))).toEqual({
      ok: true,
      gravacao: {
        p_ordem_id: ordemId,
        p_status_esperado: 'agendada',
        p_status_novo: 'em_execucao',
        p_tecnico_id: tecnicoId,
        p_agendada_para: '2026-10-22T13:00:00.000Z',
        p_duracao_minutos: 60,
        p_motivo_cancelamento: null,
        p_tipo_evento: 'mudanca_status',
        p_descricao: 'Execução iniciada',
        p_usuario_id: tecnicoId,
      },
    });
  });

  it('pausa com o motivo e retoma depois', () => {
    const emExecucao = { ...agendada, status: 'em_execucao' as const };
    expect(decidir(contexto({ pedido: pausar, ...doTecnico, ordem: emExecucao }))).toMatchObject({
      ok: true,
      gravacao: { p_status_novo: 'pausada', p_descricao: 'Pausada: Aguardando peça' },
    });

    const pausada = { ...agendada, status: 'pausada' as const };
    expect(decidir(contexto({ pedido: iniciar, ...doTecnico, ordem: pausada }))).toMatchObject({
      ok: true,
      gravacao: { p_status_novo: 'em_execucao', p_descricao: 'Execução retomada' },
    });
  });

  it('gestor não executa no lugar do técnico; técnico de outra OS nem vê', () => {
    expect(decidir(contexto({ pedido: iniciar, ordem: agendada }))).toMatchObject({
      codigo: 'sem_permissao',
    });
    const outroTecnico = '00000000-0000-4000-8000-000000000009';
    expect(
      decidir(contexto({ pedido: iniciar, ...doTecnico, usuarioId: outroTecnico })),
    ).toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('modo autônomo: admin que também é o técnico da OS executa', () => {
    const autonomo: Vinculo = { papeis: ['admin', 'gestor', 'tecnico'], ativo: true, nome: 'Ana' };
    expect(decidir(contexto({ pedido: iniciar, ...doTecnico, quemPede: autonomo }))).toMatchObject({
      ok: true,
    });
  });

  it('segue as transições: não inicia OS só aberta, nem pausa OS agendada', () => {
    expect(
      decidir(
        contexto({ pedido: iniciar, ...doTecnico, ordem: { ...agendada, status: 'aberta' } }),
      ),
    ).toMatchObject({ codigo: 'transicao_invalida', mensagem: /Agende a OS/ });
    expect(decidir(contexto({ pedido: pausar, ...doTecnico }))).toMatchObject({
      codigo: 'transicao_invalida',
    });
    expect(
      decidir(
        contexto({ pedido: iniciar, ...doTecnico, ordem: { ...agendada, status: 'concluida' } }),
      ),
    ).toMatchObject({ codigo: 'transicao_invalida', mensagem: /encerrada/ });
  });

  it('técnico continua sem poder agendar ou cancelar', () => {
    expect(decidir(contexto({ pedido: cancelar, ...doTecnico }))).toMatchObject({
      codigo: 'sem_permissao',
    });
  });
});
