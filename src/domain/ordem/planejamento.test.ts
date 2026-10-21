import { describe, expect, it } from 'vitest';
import { ordemDeTeste } from '@/test/dados';
import { FILTRO_PADRAO, filtrarOrdens } from './filtros';
import {
  AgendamentoFormularioSchema,
  agendamentoParaFormulario,
  CancelamentoFormularioSchema,
  conflitosDeHorario,
  eDeHoje,
  estaAtrasada,
  podeAgendar,
  podeCancelar,
} from './planejamento';

const tecnicoId = '00000000-0000-4000-8000-000000000003';
// Datas locais (do fuso de quem roda o teste), como o navegador faria.
const agora = new Date(2026, 9, 21, 9, 30);

describe('formulário de agendamento', () => {
  it('junta data e hora locais num instante em ISO 8601', () => {
    const dados = AgendamentoFormularioSchema.parse({
      tecnicoId,
      data: '2026-10-22',
      hora: '14:00',
      duracaoMinutos: '90',
    });
    expect(dados).toEqual({
      tecnicoId,
      agendadaPara: new Date(2026, 9, 22, 14, 0).toISOString(),
      duracaoMinutos: 90,
    });
  });

  it('exige técnico, data e hora', () => {
    const resultado = AgendamentoFormularioSchema.safeParse({
      tecnicoId: '',
      data: '',
      hora: '',
      duracaoMinutos: 60,
    });
    expect(resultado.error?.issues.map((problema) => problema.message)).toEqual([
      'Escolha o técnico',
      'Informe a data',
      'Informe a hora',
    ]);
  });

  it('começa do agendamento atual ou da próxima hora cheia', () => {
    const agendada = {
      ...ordemDeTeste,
      tecnicoId,
      agendadaPara: new Date(2026, 9, 23, 8).toISOString(),
    };
    expect(agendamentoParaFormulario(agendada, agora)).toEqual({
      tecnicoId,
      data: '2026-10-23',
      hora: '08:00',
      duracaoMinutos: 60,
    });
    expect(agendamentoParaFormulario(ordemDeTeste, agora)).toMatchObject({
      tecnicoId: '',
      data: '2026-10-21',
      hora: '10:00',
    });
    // Depois das 17h, sugere 8h do dia seguinte.
    expect(agendamentoParaFormulario(ordemDeTeste, new Date(2026, 9, 21, 18, 10))).toMatchObject({
      data: '2026-10-22',
      hora: '08:00',
    });
  });

  it('cancelamento exige motivo', () => {
    expect(CancelamentoFormularioSchema.safeParse({ motivo: ' ok ' }).success).toBe(false);
    expect(CancelamentoFormularioSchema.parse({ motivo: '  Duplicada  ' })).toEqual({
      motivo: 'Duplicada',
    });
  });
});

describe('situação da OS no planejamento', () => {
  const agendada = {
    ...ordemDeTeste,
    status: 'agendada' as const,
    tecnicoId,
    agendadaPara: new Date(2026, 9, 21, 8).toISOString(),
  };

  it('pode agendar aberta, agendada (reagendar) e pausada; não em execução nem encerrada', () => {
    expect(podeAgendar({ status: 'aberta' })).toBe(true);
    expect(podeAgendar({ status: 'agendada' })).toBe(true);
    expect(podeAgendar({ status: 'pausada' })).toBe(true);
    expect(podeAgendar({ status: 'em_execucao' })).toBe(false);
    expect(podeAgendar({ status: 'concluida' })).toBe(false);
    expect(podeCancelar({ status: 'em_execucao' })).toBe(true);
    expect(podeCancelar({ status: 'cancelada' })).toBe(false);
  });

  it('atrasada = agendada com o horário já passado', () => {
    expect(estaAtrasada(agendada, agora)).toBe(true);
    expect(estaAtrasada({ ...agendada, status: 'em_execucao' }, agora)).toBe(false);
    expect(
      estaAtrasada({ ...agendada, agendadaPara: new Date(2026, 9, 21, 11).toISOString() }, agora),
    ).toBe(false);
  });

  it('de hoje = marcada para o mesmo dia e não cancelada', () => {
    expect(eDeHoje(agendada, agora)).toBe(true);
    expect(eDeHoje({ ...agendada, status: 'cancelada' }, agora)).toBe(false);
    expect(
      eDeHoje({ ...agendada, agendadaPara: new Date(2026, 9, 22, 8).toISOString() }, agora),
    ).toBe(false);
    expect(eDeHoje(ordemDeTeste, agora)).toBe(false);
  });

  it('filtro "atrasadas" da lista', () => {
    const ids = filtrarOrdens(
      [agendada, { ...ordemDeTeste, id: 'outra' }],
      { ...FILTRO_PADRAO, situacao: 'atrasadas' },
      agora,
    ).map((ordem) => ordem.id);
    expect(ids).toEqual([agendada.id]);
  });

  it('avisa quando o técnico já tem atendimento que se sobrepõe', () => {
    const outra = { ...agendada, id: 'outra', duracaoMinutos: 120 }; // 8h às 10h
    const conflitos = (inicio: Date, tecnico = tecnicoId) =>
      conflitosDeHorario([agendada, outra], {
        ordemId: agendada.id,
        tecnicoId: tecnico,
        inicio,
        duracaoMinutos: 60,
      }).map((ordem) => ordem.id);

    expect(conflitos(new Date(2026, 9, 21, 9, 30))).toEqual(['outra']);
    expect(conflitos(new Date(2026, 9, 21, 10, 0))).toEqual([]); // começa quando a outra termina
    expect(conflitos(new Date(2026, 9, 21, 9, 0), 'outro-tecnico')).toEqual([]);
  });
});
