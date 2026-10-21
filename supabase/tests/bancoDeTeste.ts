import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PASTA_MIGRATIONS = join(import.meta.dirname, '..', 'migrations');

// Imitação mínima do que o Supabase já traz pronto: os papéis anon/authenticated,
// a tabela auth.users e a função auth.uid(). O resto vem das nossas migrations.
const IMITACAO_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  -- Chave de serviço (usada só nas Edge Functions): ignora o RLS, como no Supabase.
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  -- Storage: só as colunas que as migrations e os testes usam. Como no Supabase, o RLS
  -- de storage.objects vem ligado e sem políticas (as migrations criam as nossas).
  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text not null,
    owner uuid default auth.uid(),
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  -- O Supabase libera tudo por padrão nas tabelas novas; as migrations precisam restringir.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

export type ResultadoConsulta = {
  linhas: Record<string, unknown>[];
  afetadas: number;
  erro: string | null;
};

export async function criarBancoDeTeste(): Promise<PGlite> {
  const banco = new PGlite();
  await banco.exec(IMITACAO_SUPABASE);

  const migrations = readdirSync(PASTA_MIGRATIONS)
    .filter((arquivo) => arquivo.endsWith('.sql'))
    .sort();
  for (const arquivo of migrations) {
    await banco.exec(readFileSync(join(PASTA_MIGRATIONS, arquivo), 'utf8'));
  }
  return banco;
}

/**
 * Roda a consulta como o usuário logado indicado (ou como anônimo, se for null), passando pelo RLS.
 * "servico" imita a chave de serviço das Edge Functions.
 */
export async function consultarComo(
  banco: PGlite,
  usuarioId: string | null | 'servico',
  sql: string,
  parametros: unknown[] = [],
): Promise<ResultadoConsulta> {
  await banco.exec('begin');
  try {
    if (usuarioId === 'servico') {
      await banco.exec('set local role service_role');
    } else if (usuarioId) {
      await banco.exec('set local role authenticated');
      await banco.query("select set_config('request.jwt.claim.sub', $1, true)", [usuarioId]);
    } else {
      await banco.exec('set local role anon');
    }
    const resultado = await banco.query<Record<string, unknown>>(sql, parametros);
    await banco.exec('commit');
    return { linhas: resultado.rows, afetadas: resultado.affectedRows ?? 0, erro: null };
  } catch (erro) {
    await banco.exec('rollback');
    return { linhas: [], afetadas: 0, erro: erro instanceof Error ? erro.message : String(erro) };
  }
}
