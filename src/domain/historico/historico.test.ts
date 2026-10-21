import { describe, expect, it } from 'vitest';
import {
  dataDoAtendimento,
  podeAbrirOrdemDoHistorico,
  resumirHistorico,
  type AtendimentoHistorico,
} from './historico';

function atendimento(mudancas: Partial<AtendimentoHistorico>): AtendimentoHistorico {
  return {
    ordemId: 'os',
    numero: 1,
    localNome: 'UTI',
    tipoServico: 'corretiva',
    status: 'concluida',
    problema: 'Não gela',
    tecnicoId: 'tec-1',
    tecnicoNome: 'João',
    agendadaPara: null,
    criadoEm: '2026-01-10T12:00:00Z',
    concluidaEm: null,
    diagnostico: null,
    fotos: 0,
    naoConformes: 0,
    ...mudancas,
  };
}

const agora = new Date('2026-10-24T12:00:00Z');

describe('dataDoAtendimento', () => {
  it('usa a conclusão; senão o agendamento; senão a abertura', () => {
    expect(
      dataDoAtendimento(
        atendimento({ concluidaEm: '2026-10-01T10:00:00Z', agendadaPara: '2026-09-30T10:00:00Z' }),
      ),
    ).toBe('2026-10-01T10:00:00Z');
    expect(dataDoAtendimento(atendimento({ agendadaPara: '2026-09-30T10:00:00Z' }))).toBe(
      '2026-09-30T10:00:00Z',
    );
    expect(dataDoAtendimento(atendimento({}))).toBe('2026-01-10T12:00:00Z');
  });
});

describe('resumirHistorico', () => {
  it('conta atendimentos válidos, acha o último concluído e as corretivas dos últimos 12 meses', () => {
    const resumo = resumirHistorico(
      [
        atendimento({ numero: 1, concluidaEm: '2026-03-01T10:00:00Z' }),
        atendimento({ numero: 2, concluidaEm: '2026-09-15T10:00:00Z', tipoServico: 'preventiva' }),
        atendimento({ numero: 3, status: 'cancelada', concluidaEm: null }),
        // Mais de 12 meses: não entra nas corretivas recentes.
        atendimento({ numero: 4, concluidaEm: '2025-06-01T10:00:00Z' }),
        atendimento({ numero: 5, status: 'agendada', agendadaPara: '2026-10-30T10:00:00Z' }),
      ],
      agora,
    );

    expect(resumo.total).toBe(4);
    expect(resumo.ultimoConcluido?.numero).toBe(2);
    expect(resumo.corretivasUltimos12Meses).toBe(2);
  });

  it('sem atendimentos', () => {
    expect(resumirHistorico([], agora)).toEqual({
      total: 0,
      ultimoConcluido: null,
      corretivasUltimos12Meses: 0,
    });
  });
});

describe('podeAbrirOrdemDoHistorico', () => {
  it('admin e gestor abrem qualquer OS; técnico só as dele', () => {
    const doOutro = { tecnicoId: 'tec-2' };
    expect(podeAbrirOrdemDoHistorico(doOutro, { usuarioId: 'g', papeis: ['gestor'] })).toBe(true);
    expect(podeAbrirOrdemDoHistorico(doOutro, { usuarioId: 'tec-1', papeis: ['tecnico'] })).toBe(
      false,
    );
    expect(
      podeAbrirOrdemDoHistorico(
        { tecnicoId: 'tec-1' },
        { usuarioId: 'tec-1', papeis: ['tecnico'] },
      ),
    ).toBe(true);
  });
});
