import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste } from './bancoDeTeste.ts';

const SEED = readFileSync(join(import.meta.dirname, '..', 'seed.sql'), 'utf8');

let banco: PGlite;

async function contar(tabela: string): Promise<number> {
  const resultado = await banco.query<{ total: number }>(
    `select count(*)::int as total from ${tabela}`,
  );
  return resultado.rows[0].total;
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
});

describe('dados de exemplo (seed.sql)', () => {
  it('sem empresa cadastrada, não faz nada', async () => {
    await banco.exec(SEED);
    expect(await contar('clientes')).toBe(0);
  });

  it('insere clientes, locais e equipamentos na empresa, uma vez só', async () => {
    await banco.query("insert into organizacoes (nome) values ('Minha Empresa')");

    await banco.exec(SEED);
    await banco.exec(SEED);

    expect(await contar('clientes')).toBe(5);
    expect(await contar('locais_atendimento')).toBe(10);
    expect(await contar('equipamentos')).toBe(14);
    expect(await contar('ordens_servico')).toBe(4);
    expect(await contar('ordem_servico_equipamentos')).toBe(5);
    // Cada OS de exemplo também ganha a linha de abertura no histórico.
    expect(await contar('ordem_servico_eventos')).toBe(4);
  });

  it('não cria OS de exemplo numa empresa só com clientes reais', async () => {
    const empresa = await banco.query<{ id: string }>(
      "insert into organizacoes (nome) values ('Minha Empresa') returning id",
    );
    await banco.query("insert into clientes (organizacao_id, nome) values ($1, 'Cliente real')", [
      empresa.rows[0].id,
    ]);

    await banco.exec(SEED);

    expect(await contar('ordens_servico')).toBe(0);
  });

  it('não mexe numa empresa que já tem clientes', async () => {
    const empresa = await banco.query<{ id: string }>(
      "insert into organizacoes (nome) values ('Minha Empresa') returning id",
    );
    await banco.query("insert into clientes (organizacao_id, nome) values ($1, 'Cliente real')", [
      empresa.rows[0].id,
    ]);

    await banco.exec(SEED);

    expect(await contar('clientes')).toBe(1);
  });
});
