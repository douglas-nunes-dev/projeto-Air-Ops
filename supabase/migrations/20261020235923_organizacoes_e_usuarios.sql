-- Etapa 0: organizações, usuários e vínculo com papel (seções 5, 10 e 11 do projeto.md).
--
-- Regras de acesso (RLS):
--   organizacoes          ler: membros ativos          alterar: admin
--   usuarios              ler: o próprio e colegas     alterar: só o próprio nome
--   organizacao_usuarios  ler: o próprio vínculo; admin e gestor veem os da organização
--                         criar/alterar/remover: admin, exceto o próprio vínculo
-- Criar organizações fica fora do app no MVP (painel do Supabase ou Edge Function com service_role).

-- Funções auxiliares ficam num schema que a API não expõe.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;
grant usage on schema privado to authenticated;

create type public.papel_usuario as enum ('admin', 'gestor', 'tecnico');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 120),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Perfil ligado ao login. A linha é criada pelo gatilho em auth.users, nunca pelo app.
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text not null default '' check (length(nome) <= 120),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.organizacao_usuarios (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  -- Uma pessoa pode acumular papéis (ex.: modo autônomo = admin + gestor + técnico).
  papeis public.papel_usuario[] not null check (cardinality(papeis) > 0),
  -- Desativar (em vez de apagar) corta o acesso na hora e mantém o histórico.
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organizacao_id, usuario_id)
);

create index organizacao_usuarios_usuario_id_idx on public.organizacao_usuarios (usuario_id);

-- ---------------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------------

create function privado.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger definir_atualizado_em before update on public.organizacoes
  for each row execute function privado.definir_atualizado_em();
create trigger definir_atualizado_em before update on public.usuarios
  for each row execute function privado.definir_atualizado_em();
create trigger definir_atualizado_em before update on public.organizacao_usuarios
  for each row execute function privado.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Perfil criado e e-mail sincronizado a partir do login (auth.users)
-- ---------------------------------------------------------------------------

create function privado.criar_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, email, nome)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'nome', ''), 120)
  );
  return new;
end;
$$;

create trigger criar_perfil_usuario after insert on auth.users
  for each row execute function privado.criar_perfil_usuario();

create function privado.sincronizar_email_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.usuarios set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger sincronizar_email_usuario after update of email on auth.users
  for each row execute function privado.sincronizar_email_usuario();

-- ---------------------------------------------------------------------------
-- Funções usadas pelas políticas
-- security definer: leem organizacao_usuarios sem passar pelo RLS dela (evita recursão).
-- ---------------------------------------------------------------------------

create function privado.organizacoes_do_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organizacao_id
  from public.organizacao_usuarios
  where usuario_id = (select auth.uid()) and ativo;
$$;

create function privado.tem_papel(organizacao uuid, papeis_aceitos public.papel_usuario[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizacao_usuarios
    where usuario_id = (select auth.uid())
      and organizacao_id = organizacao
      and ativo
      and papeis && papeis_aceitos
  );
$$;

revoke all on function privado.organizacoes_do_usuario() from public;
revoke all on function privado.tem_papel(uuid, public.papel_usuario[]) from public;
grant execute on function privado.organizacoes_do_usuario() to authenticated;
grant execute on function privado.tem_papel(uuid, public.papel_usuario[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Permissões de tabela e coluna (o RLS filtra as linhas; isto limita as operações)
-- ---------------------------------------------------------------------------

revoke all on public.organizacoes, public.usuarios, public.organizacao_usuarios from anon, authenticated;

grant select on public.organizacoes to authenticated;
grant update (nome) on public.organizacoes to authenticated;

grant select on public.usuarios to authenticated;
grant update (nome) on public.usuarios to authenticated;

grant select, delete on public.organizacao_usuarios to authenticated;
grant insert (organizacao_id, usuario_id, papeis, ativo) on public.organizacao_usuarios to authenticated;
grant update (papeis, ativo) on public.organizacao_usuarios to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organizacoes enable row level security;
alter table public.usuarios enable row level security;
alter table public.organizacao_usuarios enable row level security;

-- organizacoes
create policy "membros leem a própria organização"
  on public.organizacoes for select to authenticated
  using (id in (select privado.organizacoes_do_usuario()));

create policy "admin altera a organização"
  on public.organizacoes for update to authenticated
  using (privado.tem_papel(id, array['admin']::public.papel_usuario[]))
  with check (privado.tem_papel(id, array['admin']::public.papel_usuario[]));

-- usuarios
create policy "usuário lê o próprio perfil e o dos colegas"
  on public.usuarios for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.organizacao_usuarios ou
      where ou.usuario_id = usuarios.id
        and ou.organizacao_id in (select privado.organizacoes_do_usuario())
    )
  );

create policy "usuário altera o próprio perfil"
  on public.usuarios for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- organizacao_usuarios
-- Gestor também lê os vínculos: precisa da lista de técnicos para atribuir OS.
create policy "usuário lê o próprio vínculo; admin e gestor leem os da organização"
  on public.organizacao_usuarios for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[])
  );

-- Ninguém altera o próprio vínculo: impede o admin de se trancar fora por engano.
create policy "admin adiciona pessoas à organização"
  on public.organizacao_usuarios for insert to authenticated
  with check (
    usuario_id <> (select auth.uid())
    and privado.tem_papel(organizacao_id, array['admin']::public.papel_usuario[])
  );

create policy "admin altera vínculos da organização"
  on public.organizacao_usuarios for update to authenticated
  using (
    usuario_id <> (select auth.uid())
    and privado.tem_papel(organizacao_id, array['admin']::public.papel_usuario[])
  )
  with check (
    usuario_id <> (select auth.uid())
    and privado.tem_papel(organizacao_id, array['admin']::public.papel_usuario[])
  );

create policy "admin remove vínculos da organização"
  on public.organizacao_usuarios for delete to authenticated
  using (
    usuario_id <> (select auth.uid())
    and privado.tem_papel(organizacao_id, array['admin']::public.papel_usuario[])
  );
