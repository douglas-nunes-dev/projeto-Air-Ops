import { describe, expect, it } from 'vitest';
import { equipamentoDeTeste, ordemDeTeste } from '@/test/dados';
import {
  descreverSituacao,
  diaNoFuso,
  diasEntre,
  proximaAposConclusao,
  situacaoDaPreventiva,
  somarDias,
  vencimentoDaPreventiva,
} from './preventiva';
import {
  agruparPorLocal,
  listarPreventivasPendentes,
  ordemPreventivaDoLocal,
} from './preventivasPendentes';
import type { Equipamento } from './tipos';

const hoje = '2026-10-24';

describe('datas', () => {
  it('usa o dia no fuso da empresa (o servidor roda em UTC)', () => {
    // 01:30 de 25/10 em UTC ainda é 24/10 em São Paulo.
    expect(diaNoFuso(new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-24');
  });

  it('soma dias e conta a diferença, inclusive virando mês e ano', () => {
    expect(somarDias('2026-12-15', 30)).toBe('2027-01-14');
    expect(diasEntre('2026-10-24', '2026-10-20')).toBe(-4);
  });

  it('próxima depois de concluir = dia da conclusão + periodicidade', () => {
    expect(proximaAposConclusao(new Date('2026-10-25T01:30:00Z'), 30)).toBe('2026-11-23');
  });
});

describe('vencimento e situação', () => {
  const base = { periodicidadeDias: 30, proximaManutencao: null, dataInstalacao: null };

  it('usa a data guardada; senão instalação + periodicidade; senão vence hoje', () => {
    expect(vencimentoDaPreventiva({ ...base, proximaManutencao: '2026-11-10' }, hoje)).toBe(
      '2026-11-10',
    );
    expect(vencimentoDaPreventiva({ ...base, dataInstalacao: '2026-10-01' }, hoje)).toBe(
      '2026-10-31',
    );
    expect(vencimentoDaPreventiva(base, hoje)).toBe(hoje);
    expect(vencimentoDaPreventiva({ ...base, periodicidadeDias: null }, hoje)).toBeNull();
  });

  it('vencida, vencendo (até 30 dias) ou em dia, com texto para a tela', () => {
    const vencida = situacaoDaPreventiva({ ...base, proximaManutencao: '2026-10-21' }, hoje);
    expect(vencida).toEqual({ tipo: 'vencida', dias: 3, vencimento: '2026-10-21' });
    expect(descreverSituacao(vencida)).toBe('Vencida há 3 dias');

    const vencendo = situacaoDaPreventiva({ ...base, proximaManutencao: '2026-11-23' }, hoje);
    expect(vencendo.tipo).toBe('vencendo');
    expect(descreverSituacao(situacaoDaPreventiva(base, hoje))).toBe('Vence hoje');

    const emDia = situacaoDaPreventiva({ ...base, proximaManutencao: '2026-12-31' }, hoje);
    expect(emDia.tipo).toBe('em_dia');
  });
});

describe('lista de pendentes e OS por local', () => {
  function equipamento(mudancas: Partial<Equipamento>): Equipamento {
    return { ...equipamentoDeTeste, periodicidadeDias: 30, ...mudancas };
  }
  const uti1 = equipamento({
    id: 'uti-1',
    identificacao: 'Split UTI 1',
    proximaManutencao: '2026-10-20',
  });
  const uti2 = equipamento({
    id: 'uti-2',
    identificacao: 'Split UTI 2',
    proximaManutencao: '2026-11-05',
  });
  const recepcao = equipamento({
    id: 'rec-1',
    identificacao: 'Split recepção',
    localId: 'local-recepcao',
    localNome: 'Recepção',
    proximaManutencao: '2026-11-01',
  });
  const emDia = equipamento({ id: 'em-dia', proximaManutencao: '2027-01-30' });
  const arquivado = equipamento({ id: 'arq', ativo: false, proximaManutencao: '2026-10-01' });
  const semPeriodicidade = equipamento({ id: 'sem', periodicidadeDias: null });

  it('só ativos vencidos ou vencendo, do mais atrasado ao mais distante', () => {
    const pendentes = listarPreventivasPendentes(
      [uti2, emDia, recepcao, arquivado, semPeriodicidade, uti1],
      [],
      hoje,
    );
    expect(pendentes.map((pendente) => pendente.equipamento.id)).toEqual([
      'uti-1',
      'rec-1',
      'uti-2',
    ]);
  });

  it('aponta a preventiva já aberta para não gerar outra', () => {
    const aberta = {
      ...ordemDeTeste,
      id: 'os-9',
      numero: 9,
      tipoServico: 'preventiva' as const,
      status: 'agendada' as const,
      equipamentos: [{ id: 'uti-1', identificacao: 'Split UTI 1' }],
    };
    const concluida = { ...aberta, id: 'os-8', numero: 8, status: 'concluida' as const };
    const [primeiro] = listarPreventivasPendentes([uti1], [concluida, aberta], hoje);
    expect(primeiro.ordemAberta).toEqual({ id: 'os-9', numero: 9 });
  });

  it('agrupa por local e monta uma OS de preventiva por local', () => {
    const grupos = agruparPorLocal(listarPreventivasPendentes([uti1, uti2, recepcao], [], hoje));
    expect(grupos.map((grupo) => grupo.localNome)).toEqual(['Bloco B — UTI', 'Recepção']);

    const uti = ordemPreventivaDoLocal(grupos[0]);
    expect(uti).toEqual({
      clienteId: equipamentoDeTeste.clienteId,
      localId: equipamentoDeTeste.localId,
      tipoServico: 'preventiva',
      // Tem equipamento vencido: prioridade alta.
      prioridade: 'alta',
      problema: 'Manutenção preventiva programada: Split UTI 1, Split UTI 2.',
      solicitante: '',
      equipamentoIds: ['uti-1', 'uti-2'],
    });
    expect(ordemPreventivaDoLocal(grupos[1]).prioridade).toBe('media');
  });
});
