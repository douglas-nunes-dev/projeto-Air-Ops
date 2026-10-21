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
  nomes,
  prepararEmpresasEPessoas,
  tecnicoA,
} from './cenario.ts';

// Etapa 1: clientes, locais e equipamentos. Permissões da seção 11:
// admin e gestor leem e alteram; técnico só lê; ninguém vê outra empresa.
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const clienteB = 'c0000000-0000-4000-8000-00000000000b';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const localB = 'd0000000-0000-4000-8000-00000000000b';
const equipamentoA = 'e0000000-0000-4000-8000-00000000000a';

let banco: PGlite;

async function prepararCadastros(): Promise<void> {
  await banco.query(
    `insert into clientes (id, organizacao_id, nome, documento) values
      ($1, $2, 'Hospital A', '11222333000181'), ($3, $4, 'Hospital B', null)`,
    [clienteA, empresaA, clienteB, empresaB],
  );
  await banco.query(
    `insert into locais_atendimento (id, organizacao_id, cliente_id, nome) values
      ($1, $2, $3, 'UTI A'), ($4, $5, $6, 'UTI B')`,
    [localA, empresaA, clienteA, localB, empresaB, clienteB],
  );
  await banco.query(
    `insert into equipamentos (id, organizacao_id, local_id, identificacao, tipo, patrimonio)
      values ($1, $2, $3, 'Split UTI A', 'split', 'PAT-001')`,
    [equipamentoA, empresaA, localA],
  );
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
  await prepararEmpresasEPessoas(banco);
  await prepararCadastros();
});

describe('leitura', () => {
  it('cada empresa vê só os próprios cadastros', async () => {
    const consultas: [string, string, string[], string[]][] = [
      ['select nome from clientes', 'nome', ['Hospital A'], ['Hospital B']],
      ['select nome from locais_atendimento', 'nome', ['UTI A'], ['UTI B']],
      ['select identificacao from equipamentos', 'identificacao', ['Split UTI A'], []],
    ];
    for (const [sql, coluna, daA, daB] of consultas) {
      expect(nomes(await consultarComo(banco, adminA, sql), coluna), sql).toEqual(daA);
      expect(nomes(await consultarComo(banco, tecnicoA, sql), coluna), sql).toEqual(daA);
      expect(nomes(await consultarComo(banco, adminB, sql), coluna), sql).toEqual(daB);
    }
  });

  it('vínculo desativado e anônimo não leem nada', async () => {
    for (const tabela of ['clientes', 'locais_atendimento', 'equipamentos']) {
      const desativado = await consultarComo(banco, desativadoA, `select * from ${tabela}`);
      expect(desativado.linhas, tabela).toEqual([]);

      const anonimo = await consultarComo(banco, null, `select * from ${tabela}`);
      expect(anonimo.erro, tabela).toMatch(/permission denied/);
    }
  });
});

describe('cadastro e alteração por papel', () => {
  const novoCliente = "insert into clientes (organizacao_id, nome) values ($1, 'Clínica Nova')";

  it('admin e gestor cadastram clientes na própria empresa', async () => {
    expect((await consultarComo(banco, adminA, novoCliente, [empresaA])).afetadas).toBe(1);
    expect((await consultarComo(banco, gestorA, novoCliente, [empresaA])).afetadas).toBe(1);
  });

  it('técnico não cadastra nem altera cadastros', async () => {
    expect((await consultarComo(banco, tecnicoA, novoCliente, [empresaA])).erro).toMatch(
      /row-level security/,
    );

    const alteracoes: [string, string][] = [
      ["update clientes set nome = 'X' where id = $1", clienteA],
      ["update locais_atendimento set nome = 'X' where id = $1", localA],
      ["update equipamentos set identificacao = 'X' where id = $1", equipamentoA],
    ];
    for (const [sql, id] of alteracoes) {
      expect((await consultarComo(banco, tecnicoA, sql, [id])).afetadas, sql).toBe(0);
    }
  });

  it('ninguém cadastra na empresa de outro', async () => {
    expect((await consultarComo(banco, adminA, novoCliente, [empresaB])).erro).toMatch(
      /row-level security/,
    );
  });

  it('ninguém altera cadastros de outra empresa', async () => {
    const resultado = await consultarComo(
      banco,
      adminA,
      "update clientes set nome = 'Invadido' where id = $1",
      [clienteB],
    );
    expect(resultado.afetadas).toBe(0);
  });

  it('admin arquiva cliente (ativo = false), mas não apaga', async () => {
    const arquivar = await consultarComo(
      banco,
      adminA,
      'update clientes set ativo = false where id = $1',
      [clienteA],
    );
    expect(arquivar.afetadas).toBe(1);

    const apagar = await consultarComo(banco, adminA, 'delete from clientes where id = $1', [
      clienteA,
    ]);
    expect(apagar.erro).toMatch(/permission denied/);
  });

  it('não dá para mudar a empresa de um cadastro nem o cliente de um local', async () => {
    const trocarEmpresa = await consultarComo(
      banco,
      adminA,
      'update clientes set organizacao_id = $1 where id = $2',
      [empresaB, clienteA],
    );
    const trocarCliente = await consultarComo(
      banco,
      adminA,
      'update locais_atendimento set cliente_id = $1 where id = $2',
      [clienteB, localA],
    );
    expect(trocarEmpresa.erro).toMatch(/permission denied/);
    expect(trocarCliente.erro).toMatch(/permission denied/);
  });
});

describe('vínculos entre empresas (chaves compostas)', () => {
  it('não liga um local da empresa A a um cliente da empresa B', async () => {
    const resultado = await consultarComo(
      banco,
      adminA,
      "insert into locais_atendimento (organizacao_id, cliente_id, nome) values ($1, $2, 'Invasão')",
      [empresaA, clienteB],
    );
    expect(resultado.erro).toMatch(/foreign key/);
  });

  it('não move um equipamento da empresa A para um local da empresa B', async () => {
    const resultado = await consultarComo(
      banco,
      adminA,
      'update equipamentos set local_id = $1 where id = $2',
      [localB, equipamentoA],
    );
    expect(resultado.erro).toMatch(/foreign key/);
  });
});

describe('regras de dados', () => {
  it('documento (CPF/CNPJ) e patrimônio não se repetem na mesma empresa', async () => {
    const cliente = await consultarComo(
      banco,
      adminA,
      "insert into clientes (organizacao_id, nome, documento) values ($1, 'Repetido', '11222333000181')",
      [empresaA],
    );
    const equipamento = await consultarComo(
      banco,
      adminA,
      "insert into equipamentos (organizacao_id, local_id, identificacao, tipo, patrimonio) values ($1, $2, 'Outro', 'split', 'PAT-001')",
      [empresaA, localA],
    );
    expect(cliente.erro).toMatch(/duplicate key/);
    expect(equipamento.erro).toMatch(/duplicate key/);
  });

  it('o mesmo documento pode existir em empresas diferentes', async () => {
    const resultado = await consultarComo(
      banco,
      adminB,
      "insert into clientes (organizacao_id, nome, documento) values ($1, 'Mesmo CNPJ', '11222333000181')",
      [empresaB],
    );
    expect(resultado.afetadas).toBe(1);
  });

  it('recusa formatos inválidos de documento, telefone, CEP e UF', async () => {
    const invalidos: [string, unknown[]][] = [
      [
        "insert into clientes (organizacao_id, nome, documento) values ($1, 'X Ltda', '123')",
        [empresaA],
      ],
      [
        "insert into clientes (organizacao_id, nome, telefone) values ($1, 'X Ltda', '(35) 9999')",
        [empresaA],
      ],
      [
        "insert into locais_atendimento (organizacao_id, cliente_id, nome, cep) values ($1, $2, 'Sede', '37900-000')",
        [empresaA, clienteA],
      ],
      [
        "insert into locais_atendimento (organizacao_id, cliente_id, nome, uf) values ($1, $2, 'Sede', 'mg')",
        [empresaA, clienteA],
      ],
    ];
    for (const [sql, parametros] of invalidos) {
      expect((await consultarComo(banco, adminA, sql, parametros)).erro, sql).toMatch(
        /check constraint/,
      );
    }
  });
});
