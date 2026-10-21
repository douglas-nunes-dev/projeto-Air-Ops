import { describe, expect, it } from 'vitest';
import {
  caminhoDaFoto,
  formatarDuracao,
  motivoDaPausa,
  PausaFormularioSchema,
  podeEnviarFotos,
  podeIniciar,
  podePausar,
  podeRegistrarExecucao,
  progressoChecklist,
  tempoTrabalhado,
} from './execucao';
import type { EventoOrdem } from './tipos';

const tecnico = { usuarioId: 'tec-1', papeis: ['tecnico' as const] };
const gestor = { usuarioId: 'ges-1', papeis: ['gestor' as const] };

function evento(
  criadoEm: string,
  statusAnterior: EventoOrdem['statusAnterior'],
  statusNovo: EventoOrdem['statusNovo'],
  descricao: string | null = null,
): EventoOrdem {
  return {
    id: criadoEm,
    tipo: 'mudanca_status',
    statusAnterior,
    statusNovo,
    descricao,
    usuarioNome: 'João',
    criadoEm,
  };
}

describe('quem registra a execução', () => {
  const agendada = { status: 'agendada' as const, tecnicoId: 'tec-1' };

  it('só o técnico da OS inicia, pausa e registra', () => {
    expect(podeIniciar(agendada, tecnico)).toBe(true);
    expect(podeIniciar(agendada, gestor)).toBe(false);
    expect(podeIniciar(agendada, { ...tecnico, usuarioId: 'outro' })).toBe(false);

    const emExecucao = { ...agendada, status: 'em_execucao' as const };
    expect(podePausar(emExecucao, tecnico)).toBe(true);
    expect(podeRegistrarExecucao(emExecucao, tecnico)).toBe(true);
    expect(podeRegistrarExecucao(emExecucao, gestor)).toBe(false);
  });

  it('pausada: retoma e ainda envia fotos, mas não mexe no checklist', () => {
    const pausada = { status: 'pausada' as const, tecnicoId: 'tec-1' };
    expect(podeIniciar(pausada, tecnico)).toBe(true);
    expect(podeEnviarFotos(pausada, tecnico)).toBe(true);
    expect(podeRegistrarExecucao(pausada, tecnico)).toBe(false);
  });

  it('OS só aberta não inicia (precisa ser agendada antes)', () => {
    expect(podeIniciar({ status: 'aberta', tecnicoId: 'tec-1' }, tecnico)).toBe(false);
  });
});

describe('tempoTrabalhado', () => {
  const agora = new Date('2026-10-22T15:00:00Z');

  it('soma os trechos em execução e ignora o tempo pausado', () => {
    const eventos = [
      evento('2026-10-22T13:00:00Z', 'agendada', 'em_execucao'),
      evento('2026-10-22T13:40:00Z', 'em_execucao', 'pausada', 'Pausada: Aguardando peça'),
      evento('2026-10-22T14:30:00Z', 'pausada', 'em_execucao'),
      evento('2026-10-22T14:50:00Z', 'em_execucao', 'pausada', 'Pausada: Fim do expediente'),
    ];
    // 40 min + 20 min.
    expect(tempoTrabalhado(eventos, agora)).toBe(60 * 60_000);
  });

  it('em execução agora: conta até o momento atual, em qualquer ordem de chegada', () => {
    const eventos = [
      evento('2026-10-22T14:30:00Z', 'pausada', 'em_execucao'),
      evento('2026-10-22T13:00:00Z', 'agendada', 'em_execucao'),
      evento('2026-10-22T14:00:00Z', 'em_execucao', 'pausada'),
    ];
    // 60 min + 30 min até agora.
    expect(tempoTrabalhado(eventos, agora)).toBe(90 * 60_000);
  });

  it('sem execução, zero', () => {
    expect(tempoTrabalhado([evento('2026-10-22T13:00:00Z', 'aberta', 'agendada')], agora)).toBe(0);
  });
});

describe('formatarDuracao', () => {
  it('mostra horas e minutos de forma curta', () => {
    expect(formatarDuracao(45 * 60_000)).toBe('45min');
    expect(formatarDuracao(60 * 60_000)).toBe('1h');
    expect(formatarDuracao(125 * 60_000 + 59_000)).toBe('2h 05min');
  });
});

describe('pausa', () => {
  it('motivo da pausa atual vem do último evento que pausou', () => {
    const eventos = [
      evento('2026-10-22T13:40:00Z', 'em_execucao', 'pausada', 'Pausada: Aguardando peça'),
      evento('2026-10-22T14:50:00Z', 'em_execucao', 'pausada', 'Pausada: Fim do expediente'),
    ];
    expect(motivoDaPausa(eventos)).toBe('Fim do expediente');
    expect(motivoDaPausa([])).toBeNull();
  });

  it('formulário: motivo da lista ou digitado em "outro"', () => {
    expect(PausaFormularioSchema.parse({ opcao: 'Aguardando peça', outro: '' })).toBe(
      'Aguardando peça',
    );
    expect(PausaFormularioSchema.parse({ opcao: 'outro', outro: '  Chuva forte  ' })).toBe(
      'Chuva forte',
    );
    expect(PausaFormularioSchema.safeParse({ opcao: 'outro', outro: 'x' }).success).toBe(false);
    expect(PausaFormularioSchema.safeParse({ opcao: '', outro: '' }).success).toBe(false);
  });
});

describe('checklist e fotos', () => {
  it('progresso conta os itens respondidos', () => {
    const itens = [
      { posicao: 1, item: 'A', resposta: 'ok' as const, observacao: null },
      { posicao: 2, item: 'B', resposta: null, observacao: null },
    ];
    expect(progressoChecklist(itens)).toEqual({ respondidos: 1, total: 2 });
  });

  it('caminho da foto segue o padrão do banco', () => {
    expect(caminhoDaFoto('org', 'os', 'foto')).toBe('org/os/foto.jpg');
  });
});
