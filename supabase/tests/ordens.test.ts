import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste } from './bancoDeTeste.ts';
import {
  adminA,
  adminB,
  desativadoA,
  empresaA,
  empresaB,
  gestorA,
  prepararEmpresasEPessoas,
  tecnicoA,
} from './cenario.ts';

// Etapa 2: abertura de OS. Permissões da seção 11:
// admin e gestor abrem, leem e editam; técnico só lê as atribuídas a ele; ninguém vê outra empresa.
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const outroClienteA = 'c0000000-0000-4000-8000-0000000000a2';
const clienteB = 'c0000000-0000-4000-8000-00000000000b';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const localOutroClienteA = 'd0000000-0000-4000-8000-0000000000a2';
const localB = 'd0000000-0000-4000-8000-00000000000b';
const equipamentoA = 'e0000000-0000-4000-8000-00000000000a';
const equipamentoA2 = 'e0000000-0000-4000-8000-0000000000a2';
const equipamentoB = 'e0000000-0000-4000-8000-00000000000b';

const ABRIR = 'select abrir_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8) as id';
const EDITAR = 'select editar_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8)';

let banco: PGlite;

async function prepararCadastros(): Promise<void> {
  await banco.query(
    `insert into clientes (id, organizacao_id, nome) values
      ($1, $4, 'Hospital A'), ($2, $4, 'Clínica A'), ($3, $5, 'Hospital B')`,
    [clienteA, outroClienteA, clienteB, empresaA, empresaB],
  );
  await banco.query(
    `insert into locais_atendimento (id, organizacao_id, cliente_id, nome) values
      ($1, $4, $5, 'UTI A'), ($2, $4, $6, 'Recepção Clínica A'), ($3, $7, $8, 'UTI B')`,
    [localA, localOutroClienteA, localB, empresaA, clienteA, outroClienteA, empresaB, clienteB],
  );
  await banco.query(
    `insert into equipamentos (id, organizacao_id, local_id, identificacao, tipo) values
      ($1, $4, $5, 'Split 1', 'split'), ($2, $4, $5, 'Split 2', 'split'),
      ($3, $6, $7, 'Split B', 'split')`,
    [equipamentoA, equipamentoA2, equipamentoB, empresaA, localA, empresaB, localB],
  );
}

function parametrosAbertura(
  organizacao: string,
  cliente: string,
  local: string,
  equipamentos: string[] = [],
): unknown[] {
  return [organizacao, cliente, local, 'corretiva', 'alta', 'Não está gelando', null, equipamentos];
}

/** Abre uma OS como o admin da empresa A e devolve o id. */
async function abrirOrdemA(equipamentos: string[] = [equipamentoA]): Promise<string> {
  const resultado = await consultarComo(
    banco,
    adminA,
    ABRIR,
    parametrosAbertura(empresaA, clienteA, localA, equipamentos),
  );
  expect(resultado.erro).toBeNull();
  return String(resultado.linhas[0].id);
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
  await prepararEmpresasEPessoas(banco);
  await prepararCadastros();
});

describe('abertura', () => {
  it('admin e gestor abrem OS; ela nasce "aberta", com número, autor e equipamentos', async () => {
    const id = await abrirOrdemA([equipamentoA, equipamentoA2]);
    const doGestor = await consultarComo(
      banco,
      gestorA,
      ABRIR,
      parametrosAbertura(empresaA, clienteA, localA),
    );
    expect(doGestor.erro).toBeNull();

    const ordem = await banco.query<Record<string, unknown>>(
      'select numero, status, aberta_por, tecnico_id from ordens_servico where id = $1',
      [id],
    );
    expect(ordem.rows[0]).toEqual({
      numero: 1,
      status: 'aberta',
      aberta_por: adminA,
      tecnico_id: null,
    });

    const equipamentos = await banco.query(
      'select equipamento_id from ordem_servico_equipamentos where ordem_id = $1',
      [id],
    );
    expect(equipamentos.rows).toHaveLength(2);
  });

  it('numera em sequência dentro de cada empresa', async () => {
    await abrirOrdemA();
    await abrirOrdemA();
    await consultarComo(banco, adminB, ABRIR, parametrosAbertura(empresaB, clienteB, localB));

    const numeros = await banco.query<{ organizacao_id: string; numero: number }>(
      'select organizacao_id, numero from ordens_servico order by organizacao_id, numero',
    );
    expect(numeros.rows.map((linha) => [linha.organizacao_id, linha.numero])).toEqual([
      [empresaA, 1],
      [empresaA, 2],
      [empresaB, 1],
    ]);
  });

  it('registra a abertura no histórico, com quem abriu', async () => {
    const id = await abrirOrdemA();
    const eventos = await consultarComo(
      banco,
      adminA,
      'select tipo, status_novo, usuario_id from ordem_servico_eventos where ordem_id = $1',
      [id],
    );
    expect(eventos.linhas).toEqual([
      { tipo: 'abertura', status_novo: 'aberta', usuario_id: adminA },
    ]);
  });

  it('técnico, vínculo desativado e anônimo não abrem OS', async () => {
    const parametros = parametrosAbertura(empresaA, clienteA, localA);
    expect((await consultarComo(banco, tecnicoA, ABRIR, parametros)).erro).toMatch(
      /row-level security/,
    );
    expect((await consultarComo(banco, desativadoA, ABRIR, parametros)).erro).toMatch(
      /row-level security/,
    );
    expect((await consultarComo(banco, null, ABRIR, parametros)).erro).toMatch(/permission denied/);
  });

  it('se um equipamento falhar, a OS também não é criada (tudo ou nada)', async () => {
    const resultado = await consultarComo(
      banco,
      adminA,
      ABRIR,
      parametrosAbertura(empresaA, clienteA, localA, [equipamentoA, equipamentoB]),
    );
    expect(resultado.erro).toMatch(/foreign key/);

    const total = await banco.query<{ total: number }>(
      'select count(*)::int as total from ordens_servico',
    );
    expect(total.rows[0].total).toBe(0);
  });

  it('o app não escolhe status, número, técnico nem quem abriu', async () => {
    const colunasProibidas: [string, unknown][] = [
      ['status', 'concluida'],
      ['numero', 99],
      ['tecnico_id', tecnicoA],
      ['aberta_por', gestorA],
    ];
    for (const [coluna, valor] of colunasProibidas) {
      const resultado = await consultarComo(
        banco,
        adminA,
        `insert into ordens_servico (organizacao_id, cliente_id, local_id, problema, ${coluna})
          values ($1, $2, $3, 'Teste', $4)`,
        [empresaA, clienteA, localA, valor],
      );
      expect(resultado.erro, coluna).toMatch(/permission denied/);
    }
  });

  it('ninguém grava direto no histórico', async () => {
    const id = await abrirOrdemA();
    const resultado = await consultarComo(
      banco,
      adminA,
      "insert into ordem_servico_eventos (organizacao_id, ordem_id, tipo) values ($1, $2, 'edicao')",
      [empresaA, id],
    );
    expect(resultado.erro).toMatch(/permission denied/);
  });
});

describe('vínculos entre cadastros (chaves compostas)', () => {
  it('não abre OS na empresa de outro nem com cadastros de outra empresa', async () => {
    const naEmpresaB = await consultarComo(
      banco,
      adminA,
      ABRIR,
      parametrosAbertura(empresaB, clienteB, localB),
    );
    expect(naEmpresaB.erro).toMatch(/row-level security/);

    const clienteDeB = await consultarComo(
      banco,
      adminA,
      ABRIR,
      parametrosAbertura(empresaA, clienteB, localB),
    );
    expect(clienteDeB.erro).toMatch(/foreign key/);
  });

  it('o local precisa ser do cliente escolhido', async () => {
    const resultado = await consultarComo(
      banco,
      adminA,
      ABRIR,
      parametrosAbertura(empresaA, clienteA, localOutroClienteA),
    );
    expect(resultado.erro).toMatch(/foreign key/);
  });

  it('o técnico precisa ser da mesma empresa', async () => {
    const id = await abrirOrdemA();
    await expect(
      banco.query('update ordens_servico set tecnico_id = $1 where id = $2', [adminB, id]),
    ).rejects.toThrow(/foreign key/);
  });
});

describe('leitura', () => {
  it('admin e gestor veem as OS da empresa; a outra empresa não vê nada', async () => {
    const id = await abrirOrdemA();
    const sql = 'select id from ordens_servico';

    expect((await consultarComo(banco, adminA, sql)).linhas).toEqual([{ id }]);
    expect((await consultarComo(banco, gestorA, sql)).linhas).toEqual([{ id }]);
    expect((await consultarComo(banco, adminB, sql)).linhas).toEqual([]);
    expect((await consultarComo(banco, desativadoA, sql)).linhas).toEqual([]);
  });

  it('técnico vê só as OS atribuídas a ele, com os equipamentos e o histórico delas', async () => {
    const dele = await abrirOrdemA();
    await abrirOrdemA();
    await banco.query('update ordens_servico set tecnico_id = $1 where id = $2', [tecnicoA, dele]);

    const ordens = await consultarComo(banco, tecnicoA, 'select id from ordens_servico');
    expect(ordens.linhas).toEqual([{ id: dele }]);

    const equipamentos = await consultarComo(
      banco,
      tecnicoA,
      'select distinct ordem_id from ordem_servico_equipamentos',
    );
    expect(equipamentos.linhas).toEqual([{ ordem_id: dele }]);

    const eventos = await consultarComo(
      banco,
      tecnicoA,
      'select distinct ordem_id from ordem_servico_eventos',
    );
    expect(eventos.linhas).toEqual([{ ordem_id: dele }]);
  });
});

describe('edição', () => {
  function parametrosEdicao(id: string, equipamentos: string[], prioridade = 'urgente') {
    return [id, clienteA, localA, 'corretiva', prioridade, 'Pingando água', 'Carla', equipamentos];
  }

  it('gestor edita a OS e troca os equipamentos; o histórico diz o que mudou', async () => {
    const id = await abrirOrdemA([equipamentoA]);

    const resultado = await consultarComo(
      banco,
      gestorA,
      EDITAR,
      parametrosEdicao(id, [equipamentoA2]),
    );
    expect(resultado.erro).toBeNull();

    const equipamentos = await banco.query(
      'select equipamento_id from ordem_servico_equipamentos where ordem_id = $1',
      [id],
    );
    expect(equipamentos.rows).toEqual([{ equipamento_id: equipamentoA2 }]);

    const edicao = await banco.query<Record<string, unknown>>(
      "select descricao, usuario_id from ordem_servico_eventos where ordem_id = $1 and tipo = 'edicao'",
      [id],
    );
    expect(edicao.rows).toEqual([
      {
        descricao: 'Alterado: prioridade, problema, solicitante, equipamentos',
        usuario_id: gestorA,
      },
    ]);
  });

  it('salvar sem mudar nada não cria evento; trocar só equipamentos cria', async () => {
    const id = await abrirOrdemA([equipamentoA]);
    const mesmos = [id, clienteA, localA, 'corretiva', 'alta', 'Não está gelando', null];

    await consultarComo(banco, adminA, EDITAR, [...mesmos, [equipamentoA]]);
    await consultarComo(banco, adminA, EDITAR, [...mesmos, [equipamentoA, equipamentoA2]]);

    const edicoes = await banco.query(
      "select descricao from ordem_servico_eventos where ordem_id = $1 and tipo = 'edicao'",
      [id],
    );
    expect(edicoes.rows).toEqual([{ descricao: 'Alterado: equipamentos' }]);
  });

  it('pode trocar o cliente, desde que o local seja do novo cliente', async () => {
    const id = await abrirOrdemA([]);
    const trocaValida = await consultarComo(banco, adminA, EDITAR, [
      id,
      outroClienteA,
      localOutroClienteA,
      'corretiva',
      'alta',
      'Não está gelando',
      null,
      [],
    ]);
    expect(trocaValida.erro).toBeNull();

    const localErrado = await consultarComo(banco, adminA, EDITAR, [
      id,
      clienteA,
      localOutroClienteA,
      'corretiva',
      'alta',
      'Não está gelando',
      null,
      [],
    ]);
    expect(localErrado.erro).toMatch(/foreign key/);
  });

  it('técnico e outra empresa não editam', async () => {
    const id = await abrirOrdemA();
    for (const usuario of [tecnicoA, adminB]) {
      const resultado = await consultarComo(banco, usuario, EDITAR, parametrosEdicao(id, []));
      expect(resultado.erro, usuario).toMatch(/sem permissão/);
    }
  });

  it('OS concluída ou cancelada não pode mais ser editada', async () => {
    const id = await abrirOrdemA();
    for (const status of ['concluida', 'cancelada']) {
      await banco.query(
        `update ordens_servico set status = '${status}', motivo_cancelamento = 'Teste' where id = $1`,
        [id],
      );

      const editar = await consultarComo(banco, adminA, EDITAR, parametrosEdicao(id, []));
      expect(editar.erro, status).toMatch(/sem permissão/);

      const tirarEquipamento = await consultarComo(
        banco,
        adminA,
        'delete from ordem_servico_equipamentos where ordem_id = $1',
        [id],
      );
      expect(tirarEquipamento.afetadas, status).toBe(0);
    }
  });

  it('o app não muda o status nem apaga OS', async () => {
    const id = await abrirOrdemA();
    const status = await consultarComo(
      banco,
      adminA,
      "update ordens_servico set status = 'concluida' where id = $1",
      [id],
    );
    expect(status.erro).toMatch(/permission denied/);

    const apagar = await consultarComo(banco, adminA, 'delete from ordens_servico where id = $1', [
      id,
    ]);
    expect(apagar.erro).toMatch(/permission denied/);
  });
});
