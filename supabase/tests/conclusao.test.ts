import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste } from './bancoDeTeste.ts';
import {
  adminA,
  adminB,
  empresaA,
  gestorA,
  prepararEmpresasEPessoas,
  tecnicoA,
} from './cenario.ts';

// Etapa 5: a conclusão (status + assinatura + histórico) só é gravada pela chave de serviço.
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const assinaturaId = 'a5500000-0000-4000-8000-000000000001';

const REGISTRAR_STATUS = 'select registrar_mudanca_status($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
const CONCLUIR = "select registrar_conclusao($1, $2, $3, $4, $5, $6, '[]'::jsonb)";

let banco: PGlite;
let ordemId: string;

async function mudarStatus(de: string, para: string) {
  const resultado = await consultarComo(banco, 'servico', REGISTRAR_STATUS, [
    ordemId,
    de,
    para,
    tecnicoA,
    '2026-10-23T13:00:00Z',
    60,
    null,
    'mudanca_status',
    null,
    tecnicoA,
  ]);
  expect(resultado.erro).toBeNull();
}

function caminhoAssinatura(ordem = ordemId) {
  return `${empresaA}/${ordem}/${assinaturaId}.jpg`;
}

function concluirComAssinatura(
  usuario: string | 'servico' = 'servico',
  caminho = caminhoAssinatura(),
) {
  return consultarComo(banco, usuario, CONCLUIR, [
    ordemId,
    tecnicoA,
    'Carla Souza',
    caminho,
    null,
    'Concluída. Assinada por Carla Souza',
  ]);
}

async function lerStatus() {
  const resultado = await banco.query<{ status: string }>(
    'select status from ordens_servico where id = $1',
    [ordemId],
  );
  return resultado.rows[0].status;
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
  await prepararEmpresasEPessoas(banco);
  await banco.query(
    "insert into clientes (id, organizacao_id, nome) values ($1, $2, 'Hospital A')",
    [clienteA, empresaA],
  );
  await banco.query(
    "insert into locais_atendimento (id, organizacao_id, cliente_id, nome) values ($1, $2, $3, 'UTI')",
    [localA, empresaA, clienteA],
  );
  const aberta = await consultarComo(
    banco,
    adminA,
    'select abrir_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8) as id',
    [empresaA, clienteA, localA, 'corretiva', 'alta', 'Não gela', null, []],
  );
  ordemId = String(aberta.linhas[0].id);
  await mudarStatus('aberta', 'agendada');
  await mudarStatus('agendada', 'em_execucao');
});

describe('registrar_conclusao', () => {
  it('conclui: status, assinatura e evento na mesma transação', async () => {
    expect((await concluirComAssinatura()).erro).toBeNull();

    expect(await lerStatus()).toBe('concluida');
    const assinatura = await banco.query<Record<string, unknown>>(
      'select nome_assinante, caminho, motivo_sem_assinatura, usuario_id from assinaturas',
    );
    expect(assinatura.rows).toEqual([
      {
        nome_assinante: 'Carla Souza',
        caminho: caminhoAssinatura(),
        motivo_sem_assinatura: null,
        usuario_id: tecnicoA,
      },
    ]);
    const evento = await banco.query<Record<string, unknown>>(
      "select status_anterior, status_novo, descricao from ordem_servico_eventos where status_novo = 'concluida'",
    );
    expect(evento.rows).toEqual([
      {
        status_anterior: 'em_execucao',
        status_novo: 'concluida',
        descricao: 'Concluída. Assinada por Carla Souza',
      },
    ]);
  });

  it('sem assinatura, exige o motivo (e não aceita os dois juntos)', async () => {
    const semNada = await consultarComo(banco, 'servico', CONCLUIR, [
      ordemId,
      tecnicoA,
      null,
      null,
      null,
      'x',
    ]);
    expect(semNada.erro).toMatch(/assinaturas_completa/);

    const osDois = await consultarComo(banco, 'servico', CONCLUIR, [
      ordemId,
      tecnicoA,
      'Carla',
      caminhoAssinatura(),
      'Responsável ausente',
      'x',
    ]);
    expect(osDois.erro).toMatch(/assinaturas_completa/);
    // Falhou a assinatura, então o status também não mudou (mesma transação).
    expect(await lerStatus()).toBe('em_execucao');

    const comMotivo = await consultarComo(banco, 'servico', CONCLUIR, [
      ordemId,
      tecnicoA,
      null,
      null,
      'Responsável ausente no momento',
      'Concluída sem assinatura',
    ]);
    expect(comMotivo.erro).toBeNull();
    expect(await lerStatus()).toBe('concluida');
  });

  it('a imagem precisa estar na pasta da própria OS', async () => {
    const outraPasta = `${empresaA}/bbbbbbbb-0000-4000-8000-000000000099/${assinaturaId}.jpg`;
    const resultado = await concluirComAssinatura('servico', outraPasta);
    expect(resultado.erro).toMatch(/assinaturas_caminho_padrao/);
  });

  it('só conclui OS em execução; pausada ou já concluída não', async () => {
    await mudarStatus('em_execucao', 'pausada');
    expect((await concluirComAssinatura()).erro).toMatch(/A OS mudou/);

    await mudarStatus('pausada', 'em_execucao');
    expect((await concluirComAssinatura()).erro).toBeNull();
    expect((await concluirComAssinatura()).erro).toMatch(/A OS mudou/);
  });

  it('ninguém logado executa direto, nem o técnico da OS', async () => {
    for (const usuario of [tecnicoA, gestorA, adminA]) {
      expect((await concluirComAssinatura(usuario)).erro, usuario).toMatch(/permission denied/);
    }
    expect(await lerStatus()).toBe('em_execucao');
  });
});

describe('assinaturas', () => {
  it('quem lê a OS lê a assinatura; outra empresa não', async () => {
    await concluirComAssinatura();
    const ler = 'select nome_assinante from assinaturas';
    for (const usuario of [tecnicoA, gestorA, adminA]) {
      expect((await consultarComo(banco, usuario, ler)).linhas, usuario).toHaveLength(1);
    }
    expect((await consultarComo(banco, adminB, ler)).linhas).toEqual([]);
  });

  it('ninguém altera, cria ou apaga assinatura pelo app', async () => {
    await concluirComAssinatura();
    const tentativas = [
      "update assinaturas set nome_assinante = 'Outra pessoa'",
      'delete from assinaturas',
      `insert into assinaturas (ordem_id, organizacao_id, motivo_sem_assinatura)
       values ('${ordemId}', '${empresaA}', 'Inventado aqui')`,
    ];
    for (const sql of tentativas) {
      for (const usuario of [tecnicoA, adminA]) {
        const resultado = await consultarComo(banco, usuario, sql);
        expect(resultado.erro, `${usuario}: ${sql}`).toMatch(/permission denied/);
      }
    }
  });

  it('depois de concluída, o técnico não envia mais fotos nem altera a execução', async () => {
    await concluirComAssinatura();
    const foto = await consultarComo(
      banco,
      tecnicoA,
      "insert into storage.objects (bucket_id, name) values ('anexos', $1)",
      [`${empresaA}/${ordemId}/f0000000-0000-4000-8000-000000000001.jpg`],
    );
    expect(foto.erro).toMatch(/row-level security/);
    const anotacoes = await consultarComo(
      banco,
      tecnicoA,
      'select salvar_anotacoes_execucao($1, $2, $3)',
      [ordemId, 'mudar depois', null],
    );
    expect(anotacoes.erro).toMatch(/row-level security/);
  });
});
