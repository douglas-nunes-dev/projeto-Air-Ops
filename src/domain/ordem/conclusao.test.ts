import { describe, expect, it } from 'vitest';
import { descreverConclusao, pendenciasParaConcluir } from './conclusao';
import { ConclusaoFormularioSchema, CONCLUSAO_FORMULARIO_VAZIO } from './conclusaoFormulario';
import { montarRelatorio, nomeArquivoRelatorio } from './relatorio';
import type { Execucao } from './execucao';
import type { EventoOrdem, Ordem } from './tipos';

describe('pendenciasParaConcluir', () => {
  it('pede diagnóstico, uma foto e a fila vazia', () => {
    expect(pendenciasParaConcluir({ diagnostico: ' ', fotosEnviadas: 0, fotosNaFila: 2 })).toEqual([
      'diagnostico',
      'foto',
      'fotos_na_fila',
    ]);
    expect(
      pendenciasParaConcluir({ diagnostico: 'Capacitor', fotosEnviadas: 1, fotosNaFila: 0 }),
    ).toEqual([]);
  });

  it('descreve a conclusão para o histórico', () => {
    expect(descreverConclusao({ nomeAssinante: 'Carla' })).toBe('Concluída. Assinada por Carla');
    expect(descreverConclusao({ motivoSemAssinatura: 'Ausente' })).toBe(
      'Concluída sem assinatura. Motivo: Ausente',
    );
  });
});

describe('ConclusaoFormularioSchema', () => {
  it('com assinatura: precisa ter assinado e informar o nome', () => {
    const vazio = ConclusaoFormularioSchema.safeParse(CONCLUSAO_FORMULARIO_VAZIO);
    expect(vazio.success).toBe(false);
    expect(vazio.error?.issues.map((issue) => issue.path[0])).toEqual(['assinou', 'nomeAssinante']);

    expect(
      ConclusaoFormularioSchema.parse({
        ...CONCLUSAO_FORMULARIO_VAZIO,
        assinou: true,
        nomeAssinante: '  Carla Souza ',
      }),
    ).toEqual({ nomeAssinante: 'Carla Souza' });
  });

  it('sem assinatura: só o motivo importa', () => {
    expect(
      ConclusaoFormularioSchema.parse({
        ...CONCLUSAO_FORMULARIO_VAZIO,
        semAssinatura: true,
        motivoSemAssinatura: 'Responsável ausente',
      }),
    ).toEqual({ motivoSemAssinatura: 'Responsável ausente' });
    const curto = ConclusaoFormularioSchema.safeParse({
      ...CONCLUSAO_FORMULARIO_VAZIO,
      semAssinatura: true,
      motivoSemAssinatura: 'x',
    });
    expect(curto.error?.issues[0].path).toEqual(['motivoSemAssinatura']);
  });
});

describe('montarRelatorio', () => {
  const ordem = {
    numero: 7,
    tipoServico: 'corretiva',
    clienteNome: 'Hospital São Lucas',
    localNome: 'UTI',
    solicitante: 'Carla',
    problema: 'Não gela',
    tecnicoNome: 'João',
    equipamentos: [{ id: 'e1', identificacao: 'Split leito 3' }],
  } as Ordem;
  const evento = (
    criadoEm: string,
    de: EventoOrdem['statusAnterior'],
    para: EventoOrdem['statusNovo'],
  ) =>
    ({
      id: criadoEm,
      tipo: 'mudanca_status',
      statusAnterior: de,
      statusNovo: para,
      descricao: null,
      usuarioNome: null,
      criadoEm,
    }) as EventoOrdem;
  const execucao: Execucao = {
    anotacoes: { diagnostico: 'Capacitor queimado', materiais: '1 capacitor' },
    checklist: [
      { posicao: 1, item: 'Dreno', resposta: 'nao_conforme', observacao: 'Entupido' },
      { posicao: 2, item: 'Filtros', resposta: null, observacao: null },
    ],
    atividades: [{ id: 'a', descricao: 'Troca do capacitor', criadoPorNome: 'João', criadoEm: '' }],
    fotos: [],
    assinatura: {
      nomeAssinante: 'Carla',
      caminho: 'x.jpg',
      motivoSemAssinatura: null,
      criadoEm: '2026-10-23T14:30:00Z',
    },
  };

  it('junta tudo em texto: tempo, checklist, materiais e assinatura', () => {
    const dados = montarRelatorio({
      empresa: 'Refrigeração Teste',
      ordem,
      execucao,
      eventos: [
        evento('2026-10-23T13:00:00Z', 'agendada', 'em_execucao'),
        evento('2026-10-23T14:30:00Z', 'em_execucao', 'concluida'),
      ],
      endereco: 'Rua A, 10 — Passos/MG',
      imagemAssinatura: 'data:image/jpeg;base64,xx',
      agora: new Date('2026-10-23T15:00:00Z'),
    });

    expect(dados).toMatchObject({
      numero: 'OS 7',
      tipoServico: 'Corretiva',
      equipamentos: ['Split leito 3'],
      tempoTrabalhado: '1h 30min',
      checklist: [
        { item: 'Dreno', resposta: 'Não conforme', observacao: 'Entupido' },
        { item: 'Filtros', resposta: 'Sem resposta', observacao: null },
      ],
      atividades: ['Troca do capacitor'],
      materiais: '1 capacitor',
      assinatura: { tipo: 'assinada', nome: 'Carla', imagem: 'data:image/jpeg;base64,xx' },
    });
    expect(dados.inicio).toMatch(/^23\/10\/2026 \d{2}:00$/);
    expect(dados.fim).toMatch(/^23\/10\/2026 \d{2}:30$/);
  });

  it('sem assinatura: mostra o motivo', () => {
    const dados = montarRelatorio({
      empresa: 'X',
      ordem,
      execucao: {
        ...execucao,
        assinatura: {
          nomeAssinante: null,
          caminho: null,
          motivoSemAssinatura: 'Ausente',
          criadoEm: '2026-10-23T14:30:00Z',
        },
      },
      eventos: [],
      endereco: null,
      imagemAssinatura: null,
      agora: new Date('2026-10-23T15:00:00Z'),
    });
    expect(dados.assinatura).toMatchObject({ tipo: 'sem_assinatura', motivo: 'Ausente' });
  });

  it('nome do arquivo sem acentos nem espaços', () => {
    expect(nomeArquivoRelatorio({ numero: 42, clienteNome: 'Hospital São Lucas — Bloco B' })).toBe(
      'OS-42-Hospital-Sao-Lucas-Bloco-B.pdf',
    );
  });
});
