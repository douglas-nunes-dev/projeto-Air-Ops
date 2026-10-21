import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste, type ResultadoConsulta } from './bancoDeTeste.ts';

// Testes de acesso cruzado (seção 11): entre empresas e entre papéis.
const empresaA = 'aaaaaaaa-0000-4000-8000-000000000000';
const empresaB = 'bbbbbbbb-0000-4000-8000-000000000000';

const adminA = '00000000-0000-4000-8000-000000000001';
const gestorA = '00000000-0000-4000-8000-000000000002';
const tecnicoA = '00000000-0000-4000-8000-000000000003';
const desativadoA = '00000000-0000-4000-8000-000000000004';
const adminB = '00000000-0000-4000-8000-000000000005';

let banco: PGlite;

async function prepararDados(): Promise<void> {
  const pessoas: [string, string][] = [
    [adminA, 'Admin A'],
    [gestorA, 'Gestor A'],
    [tecnicoA, 'Técnico A'],
    [desativadoA, 'Desativado A'],
    [adminB, 'Admin B'],
  ];
  for (const [id, nome] of pessoas) {
    await banco.query(
      'insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)',
      [id, `${id}@teste.com`, { nome }],
    );
  }

  await banco.query('insert into organizacoes (id, nome) values ($1, $2), ($3, $4)', [
    empresaA,
    'Empresa A',
    empresaB,
    'Empresa B',
  ]);

  const vinculos: [string, string, string, boolean][] = [
    [empresaA, adminA, '{admin}', true],
    [empresaA, gestorA, '{gestor}', true],
    [empresaA, tecnicoA, '{tecnico}', true],
    [empresaA, desativadoA, '{admin,gestor,tecnico}', false],
    [empresaB, adminB, '{admin}', true],
  ];
  for (const vinculo of vinculos) {
    await banco.query(
      'insert into organizacao_usuarios (organizacao_id, usuario_id, papeis, ativo) values ($1, $2, $3, $4)',
      vinculo,
    );
  }
}

function nomes(resultado: ResultadoConsulta): string[] {
  return resultado.linhas.map((linha) => String(linha.nome)).sort();
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
  await prepararDados();
});

describe('organizacoes', () => {
  it('cada pessoa vê só a própria empresa', async () => {
    const sql = 'select nome from organizacoes';
    expect(nomes(await consultarComo(banco, adminA, sql))).toEqual(['Empresa A']);
    expect(nomes(await consultarComo(banco, tecnicoA, sql))).toEqual(['Empresa A']);
    expect(nomes(await consultarComo(banco, adminB, sql))).toEqual(['Empresa B']);
  });

  it('vínculo desativado não vê nada', async () => {
    const resultado = await consultarComo(banco, desativadoA, 'select nome from organizacoes');
    expect(resultado.linhas).toEqual([]);
  });

  it('anônimo (chave pública sem login) não lê nada', async () => {
    for (const tabela of ['organizacoes', 'usuarios', 'organizacao_usuarios']) {
      const resultado = await consultarComo(banco, null, `select * from ${tabela}`);
      expect(resultado.erro, tabela).toMatch(/permission denied/);
    }
  });

  it('só o admin renomeia, e só a própria empresa', async () => {
    const renomear = 'update organizacoes set nome = $2 where id = $1';
    expect((await consultarComo(banco, adminA, renomear, [empresaA, 'A Ltda'])).afetadas).toBe(1);
    expect((await consultarComo(banco, adminA, renomear, [empresaB, 'Invadida'])).afetadas).toBe(0);
    expect((await consultarComo(banco, gestorA, renomear, [empresaA, 'X'])).afetadas).toBe(0);
    expect((await consultarComo(banco, tecnicoA, renomear, [empresaA, 'X'])).afetadas).toBe(0);
  });

  it('ninguém cria nem apaga empresa pelo app', async () => {
    const criar = await consultarComo(
      banco,
      adminA,
      "insert into organizacoes (nome) values ('Nova')",
    );
    const apagar = await consultarComo(banco, adminA, 'delete from organizacoes where id = $1', [
      empresaA,
    ]);
    expect(criar.erro).toMatch(/permission denied/);
    expect(apagar.erro).toMatch(/permission denied/);
  });
});

describe('usuarios', () => {
  it('o perfil é criado no cadastro do login, com o nome informado', async () => {
    const resultado = await banco.query('select nome, email from usuarios where id = $1', [adminA]);
    expect(resultado.rows).toEqual([{ nome: 'Admin A', email: `${adminA}@teste.com` }]);
  });

  it('trocar o e-mail do login atualiza o perfil', async () => {
    await banco.query('update auth.users set email = $2 where id = $1', [adminA, 'novo@teste.com']);
    const resultado = await banco.query('select email from usuarios where id = $1', [adminA]);
    expect(resultado.rows).toEqual([{ email: 'novo@teste.com' }]);
  });

  it('cada pessoa vê os colegas da própria empresa, não os de outra', async () => {
    const sql = 'select nome from usuarios';
    expect(nomes(await consultarComo(banco, adminA, sql))).toEqual([
      'Admin A',
      'Desativado A',
      'Gestor A',
      'Técnico A',
    ]);
    expect(nomes(await consultarComo(banco, adminB, sql))).toEqual(['Admin B']);
  });

  it('cada pessoa altera só o próprio nome, e não o e-mail', async () => {
    const renomear = 'update usuarios set nome = $2 where id = $1';
    expect((await consultarComo(banco, tecnicoA, renomear, [tecnicoA, 'Fulano'])).afetadas).toBe(1);
    expect((await consultarComo(banco, tecnicoA, renomear, [adminA, 'X'])).afetadas).toBe(0);

    const trocarEmail = await consultarComo(
      banco,
      tecnicoA,
      'update usuarios set email = $2 where id = $1',
      [tecnicoA, 'x@x.com'],
    );
    expect(trocarEmail.erro).toMatch(/permission denied/);
  });
});

describe('organizacao_usuarios (vínculos e papéis)', () => {
  const sql = 'select usuario_id from organizacao_usuarios';

  it('técnico vê só o próprio vínculo; gestor e admin veem os da empresa', async () => {
    expect((await consultarComo(banco, tecnicoA, sql)).linhas).toHaveLength(1);
    expect((await consultarComo(banco, gestorA, sql)).linhas).toHaveLength(4);
    expect((await consultarComo(banco, adminA, sql)).linhas).toHaveLength(4);
    expect((await consultarComo(banco, adminB, sql)).linhas).toHaveLength(1);
  });

  it('técnico e gestor não mudam papéis', async () => {
    const promover = "update organizacao_usuarios set papeis = '{admin}' where usuario_id = $1";
    expect((await consultarComo(banco, tecnicoA, promover, [tecnicoA])).afetadas).toBe(0);
    expect((await consultarComo(banco, gestorA, promover, [tecnicoA])).afetadas).toBe(0);
  });

  it('admin não altera o próprio vínculo (evita se trancar fora)', async () => {
    const rebaixar = "update organizacao_usuarios set papeis = '{gestor}' where usuario_id = $1";
    expect((await consultarComo(banco, adminA, rebaixar, [adminA])).afetadas).toBe(0);
  });

  it('admin adiciona pessoas só na própria empresa', async () => {
    const adicionar =
      "insert into organizacao_usuarios (organizacao_id, usuario_id, papeis) values ($1, $2, '{tecnico}')";
    expect((await consultarComo(banco, adminA, adicionar, [empresaA, adminB])).afetadas).toBe(1);
    expect((await consultarComo(banco, adminA, adicionar, [empresaB, gestorA])).erro).toMatch(
      /row-level security/,
    );
  });

  it('admin desativa um técnico e ele perde o acesso na hora', async () => {
    const desativar =
      'update organizacao_usuarios set ativo = false where usuario_id = $1 and organizacao_id = $2';
    expect((await consultarComo(banco, adminA, desativar, [tecnicoA, empresaA])).afetadas).toBe(1);

    const depois = await consultarComo(banco, tecnicoA, 'select nome from organizacoes');
    expect(depois.linhas).toEqual([]);
  });

  it('não dá para mover um vínculo para outra empresa nem mexer nos vínculos dela', async () => {
    const mover = 'update organizacao_usuarios set organizacao_id = $1 where usuario_id = $2';
    expect((await consultarComo(banco, adminA, mover, [empresaB, gestorA])).erro).toMatch(
      /permission denied/,
    );

    const remover = 'delete from organizacao_usuarios where usuario_id = $1';
    expect((await consultarComo(banco, adminA, remover, [adminB])).afetadas).toBe(0);
  });
});
