import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste } from './bancoDeTeste.ts';
import {
  adminA,
  adminB,
  empresaA,
  gestorA,
  prepararEmpresasEPessoas,
  tecnicoA,
} from './cenario.ts';

// Etapa 6: histórico por equipamento (resumo para qualquer membro da empresa, inclusive o
// técnico, com OS de outros técnicos) e por cliente (RLS normal).
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const outroCliente = 'c0000000-0000-4000-8000-00000000000b';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const localOutro = 'd0000000-0000-4000-8000-00000000000b';
const splitUti = 'e0000000-0000-4000-8000-000000000001';
const splitRecepcao = 'e0000000-0000-4000-8000-000000000002';
const outroTecnicoA = '00000000-0000-4000-8000-000000000006';

const HISTORICO_EQUIPAMENTO = 'select * from historico_do_equipamento($1)';
const HISTORICO_CLIENTE = 'select * from historico_do_cliente($1)';

let banco: PGlite;
const ordens: Record<string, string> = {};

async function abrir(
  nome: string,
  cliente: string,
  local: string,
  equipamentos: string[],
  tipo = 'corretiva',
) {
  const resultado = await consultarComo(
    banco,
    adminA,
    'select abrir_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8) as id',
    [empresaA, cliente, local, tipo, 'media', `Problema da ${nome}`, null, equipamentos],
  );
  expect(resultado.erro).toBeNull();
  ordens[nome] = String(resultado.linhas[0].id);
}

/** Leva a OS até o status pedido como a Edge Function faria (chave de serviço). */
async function passar(nome: string, de: string, para: string, tecnico: string) {
  const resultado = await consultarComo(
    banco,
    'servico',
    'select registrar_mudanca_status($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      ordens[nome],
      de,
      para,
      tecnico,
      '2026-10-20T13:00:00Z',
      60,
      null,
      'mudanca_status',
      null,
      tecnico,
    ],
  );
  expect(resultado.erro).toBeNull();
}

beforeAll(async () => {
  banco = await criarBancoDeTeste();
  await prepararEmpresasEPessoas(banco);
  await banco.query(
    'insert into auth.users (id, email, raw_user_meta_data) values ($1, \'outro@teste.com\', \'{"nome": "Outro Técnico"}\')',
    [outroTecnicoA],
  );
  await banco.query(
    "insert into organizacao_usuarios (organizacao_id, usuario_id, papeis) values ($1, $2, '{tecnico}')",
    [empresaA, outroTecnicoA],
  );
  await banco.query(
    "insert into clientes (id, organizacao_id, nome) values ($1, $3, 'Hospital A'), ($2, $3, 'Padaria')",
    [clienteA, outroCliente, empresaA],
  );
  await banco.query(
    "insert into locais_atendimento (id, organizacao_id, cliente_id, nome) values ($1, $3, $4, 'UTI'), ($2, $3, $5, 'Cozinha')",
    [localA, localOutro, empresaA, clienteA, outroCliente],
  );
  await banco.query(
    "insert into equipamentos (id, organizacao_id, local_id, identificacao, tipo) values ($1, $3, $4, 'Split UTI', 'split'), ($2, $3, $4, 'Split recepção', 'split')",
    [splitUti, splitRecepcao, empresaA, localA],
  );

  // OS 1: do técnico A, concluída, com diagnóstico, foto e um item não conforme.
  await abrir('os1', clienteA, localA, [splitUti], 'preventiva');
  await passar('os1', 'aberta', 'agendada', tecnicoA);
  await passar('os1', 'agendada', 'em_execucao', tecnicoA);
  await consultarComo(banco, tecnicoA, 'select preparar_checklist($1)', [ordens.os1]);
  await consultarComo(
    banco,
    tecnicoA,
    "update checklist_respostas set resposta = 'nao_conforme' where ordem_id = $1 and posicao = 1",
    [ordens.os1],
  );
  await consultarComo(banco, tecnicoA, 'select salvar_anotacoes_execucao($1, $2, $3)', [
    ordens.os1,
    'Dreno entupido',
    null,
  ]);
  await consultarComo(
    banco,
    tecnicoA,
    'insert into anexos (id, organizacao_id, ordem_id, caminho, tamanho_bytes, tirada_em) values ($1, $2, $3, $4, 100, now())',
    [
      'f0000000-0000-4000-8000-000000000001',
      empresaA,
      ordens.os1,
      `${empresaA}/${ordens.os1}/f0000000-0000-4000-8000-000000000001.jpg`,
    ],
  );
  await consultarComo(banco, 'servico', 'select registrar_conclusao($1, $2, $3, $4, $5, $6)', [
    ordens.os1,
    tecnicoA,
    null,
    null,
    'Responsável ausente',
    'Concluída sem assinatura',
  ]);

  // OS 2: mesmo equipamento, de OUTRO técnico. OS 3: outro equipamento. OS 4: outro cliente.
  await abrir('os2', clienteA, localA, [splitUti]);
  await passar('os2', 'aberta', 'agendada', outroTecnicoA);
  await abrir('os3', clienteA, localA, [splitRecepcao]);
  await abrir('os4', outroCliente, localOutro, []);
});

function numeros(linhas: Record<string, unknown>[]) {
  return linhas.map((linha) => linha.numero).sort();
}

describe('historico_do_equipamento', () => {
  it('traz só as OS daquele equipamento, com o resumo da execução', async () => {
    const resultado = await consultarComo(banco, gestorA, HISTORICO_EQUIPAMENTO, [splitUti]);
    expect(numeros(resultado.linhas)).toEqual([1, 2]);

    const os1 = resultado.linhas.find((linha) => linha.numero === 1);
    expect(os1).toMatchObject({
      status: 'concluida',
      tipo_servico: 'preventiva',
      local_nome: 'UTI',
      tecnico_nome: 'Técnico A',
      diagnostico: 'Dreno entupido',
      fotos: 1,
      nao_conformes: 1,
    });
    expect(os1?.concluida_em).not.toBeNull();
  });

  it('o técnico vê também o atendimento do outro técnico (decisão da etapa 6)...', async () => {
    const resultado = await consultarComo(banco, tecnicoA, HISTORICO_EQUIPAMENTO, [splitUti]);
    expect(numeros(resultado.linhas)).toEqual([1, 2]);
    expect(resultado.linhas.find((linha) => linha.numero === 2)).toMatchObject({
      tecnico_nome: 'Outro Técnico',
    });
  });

  it('...mas continua sem abrir a OS do outro técnico nem as fotos dela', async () => {
    const ordem = await consultarComo(
      banco,
      tecnicoA,
      'select id from ordens_servico where id = $1',
      [ordens.os2],
    );
    expect(ordem.linhas).toEqual([]);
    const assinatura = await consultarComo(
      banco,
      outroTecnicoA,
      'select 1 from assinaturas where ordem_id = $1',
      [ordens.os1],
    );
    expect(assinatura.linhas).toEqual([]);
  });

  it('outra empresa e quem não está logado não veem nada', async () => {
    expect((await consultarComo(banco, adminB, HISTORICO_EQUIPAMENTO, [splitUti])).linhas).toEqual(
      [],
    );
    expect((await consultarComo(banco, null, HISTORICO_EQUIPAMENTO, [splitUti])).erro).toMatch(
      /permission denied/,
    );
  });

  it('a lista vem da mais recente para a mais antiga', async () => {
    const resultado = await consultarComo(banco, gestorA, HISTORICO_EQUIPAMENTO, [splitUti]);
    const datas = resultado.linhas.map((linha) =>
      new Date(String(linha.concluida_em ?? linha.agendada_para ?? linha.criado_em)).getTime(),
    );
    expect(datas).toEqual([...datas].sort((a, b) => b - a));
  });
});

describe('historico_do_cliente', () => {
  it('admin e gestor veem todas as OS do cliente, e só dele', async () => {
    for (const usuario of [adminA, gestorA]) {
      const resultado = await consultarComo(banco, usuario, HISTORICO_CLIENTE, [clienteA]);
      expect(numeros(resultado.linhas), usuario).toEqual([1, 2, 3]);
    }
  });

  it('o técnico vê só as OS atribuídas a ele (RLS normal)', async () => {
    const resultado = await consultarComo(banco, tecnicoA, HISTORICO_CLIENTE, [clienteA]);
    expect(numeros(resultado.linhas)).toEqual([1]);
  });

  it('outra empresa não vê nada; a visão interna não fica exposta', async () => {
    expect((await consultarComo(banco, adminB, HISTORICO_CLIENTE, [clienteA])).linhas).toEqual([]);
    const direto = await consultarComo(banco, null, 'select * from privado.resumo_ordens');
    expect(direto.erro).toMatch(/permission denied/);
  });
});
