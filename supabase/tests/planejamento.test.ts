import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste } from './bancoDeTeste.ts';
import { adminA, empresaA, gestorA, prepararEmpresasEPessoas, tecnicoA } from './cenario.ts';

// Etapa 3: a mudança de status só é gravada pela chave de serviço (Edge Function).
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const horario = '2026-10-22T13:00:00Z';

const REGISTRAR = 'select registrar_mudanca_status($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';

let banco: PGlite;
let ordemId: string;

function agendar(statusEsperado = 'aberta', tecnico: string | null = tecnicoA): unknown[] {
  return [
    ordemId,
    statusEsperado,
    'agendada',
    tecnico,
    horario,
    90,
    null,
    'mudanca_status',
    'Agendada para qui., 22/10 às 10:00 — Técnico A',
    gestorA,
  ];
}

async function lerOrdem() {
  const resultado = await banco.query<Record<string, unknown>>(
    'select status, tecnico_id, duracao_minutos, motivo_cancelamento from ordens_servico where id = $1',
    [ordemId],
  );
  return resultado.rows[0];
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
});

describe('registrar_mudanca_status', () => {
  it('a chave de serviço agenda: grava técnico, horário, duração e o evento', async () => {
    const resultado = await consultarComo(banco, 'servico', REGISTRAR, agendar());
    expect(resultado.erro).toBeNull();

    expect(await lerOrdem()).toEqual({
      status: 'agendada',
      tecnico_id: tecnicoA,
      duracao_minutos: 90,
      motivo_cancelamento: null,
    });
    const eventos = await banco.query<Record<string, unknown>>(
      "select status_anterior, status_novo, descricao, usuario_id from ordem_servico_eventos where tipo = 'mudanca_status'",
    );
    expect(eventos.rows).toEqual([
      {
        status_anterior: 'aberta',
        status_novo: 'agendada',
        descricao: 'Agendada para qui., 22/10 às 10:00 — Técnico A',
        usuario_id: gestorA,
      },
    ]);
  });

  it('depois de agendada, o técnico passa a ver a OS', async () => {
    const antes = await consultarComo(banco, tecnicoA, 'select id from ordens_servico');
    expect(antes.linhas).toEqual([]);

    await consultarComo(banco, 'servico', REGISTRAR, agendar());

    const depois = await consultarComo(banco, tecnicoA, 'select id from ordens_servico');
    expect(depois.linhas).toEqual([{ id: ordemId }]);
  });

  it('ninguém logado executa direto, nem o admin', async () => {
    for (const usuario of [adminA, gestorA, tecnicoA, null]) {
      const resultado = await consultarComo(banco, usuario, REGISTRAR, agendar());
      expect(resultado.erro, String(usuario)).toMatch(/permission denied/);
    }
    expect((await lerOrdem()).status).toBe('aberta');
  });

  it('se o status mudou no meio do caminho, não grava nada', async () => {
    const resultado = await consultarComo(banco, 'servico', REGISTRAR, agendar('agendada'));
    expect(resultado.erro).toMatch(/A OS mudou/);

    expect((await lerOrdem()).status).toBe('aberta');
    const eventos = await banco.query(
      "select 1 from ordem_servico_eventos where tipo = 'mudanca_status'",
    );
    expect(eventos.rows).toHaveLength(0);
  });

  it('OS agendada precisa de técnico e horário; cancelada precisa de motivo', async () => {
    const semTecnico = await consultarComo(banco, 'servico', REGISTRAR, agendar('aberta', null));
    expect(semTecnico.erro).toMatch(/ordens_servico_agendada_completa/);

    const cancelarSemMotivo = await consultarComo(banco, 'servico', REGISTRAR, [
      ordemId,
      'aberta',
      'cancelada',
      null,
      null,
      null,
      null,
      'mudanca_status',
      null,
      gestorA,
    ]);
    expect(cancelarSemMotivo.erro).toMatch(/ordens_servico_cancelada_com_motivo/);
  });

  it('cancela guardando o motivo; depois disso a OS não se edita mais', async () => {
    await consultarComo(banco, 'servico', REGISTRAR, [
      ordemId,
      'aberta',
      'cancelada',
      null,
      null,
      null,
      'Cliente resolveu com outra empresa',
      'mudanca_status',
      'Motivo: Cliente resolveu com outra empresa',
      gestorA,
    ]);
    expect(await lerOrdem()).toMatchObject({
      status: 'cancelada',
      motivo_cancelamento: 'Cliente resolveu com outra empresa',
    });

    const editar = await consultarComo(
      banco,
      adminA,
      'select editar_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8)',
      [ordemId, clienteA, localA, 'corretiva', 'baixa', 'Outro texto', null, []],
    );
    expect(editar.erro).toMatch(/sem permissão/);
  });

  it('o app não grava duração nem motivo direto', async () => {
    for (const coluna of ['duracao_minutos = 30', "motivo_cancelamento = 'x'"]) {
      const resultado = await consultarComo(
        banco,
        adminA,
        `update ordens_servico set ${coluna} where id = $1`,
        [ordemId],
      );
      expect(resultado.erro, coluna).toMatch(/permission denied/);
    }
  });
});
