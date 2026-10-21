-- Etapa 1: cadastros de clientes, locais de atendimento e equipamentos (seções 3, 10 e 11).
--
-- Regras de acesso (RLS), conforme a tabela de permissões da seção 11:
--   ler:             todos os membros ativos da organização (inclusive técnico)
--   criar e alterar: admin e gestor
--   apagar:          ninguém pelo app; usa-se "arquivar" (ativo = false) para não perder o histórico
--
-- Isolamento: as chaves estrangeiras compostas (id, organizacao_id) impedem ligar um local ou
-- equipamento a um registro de outra organização, mesmo que alguém envie ids de outra empresa.

create type public.tipo_pessoa as enum ('fisica', 'juridica');

create type public.tipo_equipamento as enum (
  'split',
  'janela',
  'cassete',
  'piso_teto',
  'multi_split',
  'vrf',
  'fancoil',
  'chiller',
  'self_contained',
  'camara_fria',
  'balcao_refrigerado',
  'outro'
);

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  tipo_pessoa public.tipo_pessoa not null default 'juridica',
  nome text not null check (length(trim(nome)) between 2 and 150),
  -- Só dígitos: 11 (CPF) ou 14 (CNPJ). Os dígitos verificadores são conferidos no domínio (TS).
  documento text check (documento ~ '^([0-9]{11}|[0-9]{14})$'),
  telefone text check (telefone ~ '^[0-9]{10,11}$'),
  email text check (length(email) <= 150),
  contato_nome text check (length(contato_nome) <= 120),
  observacoes text check (length(observacoes) <= 2000),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, organizacao_id)
);

create unique index clientes_documento_unico
  on public.clientes (organizacao_id, documento)
  where documento is not null;
create index clientes_organizacao_id_idx on public.clientes (organizacao_id);

-- Endereços, unidades e setores do cliente (ex.: "Hospital — Bloco B — UTI").
create table public.locais_atendimento (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null,
  cliente_id uuid not null,
  nome text not null check (length(trim(nome)) between 2 and 120),
  cep text check (cep ~ '^[0-9]{8}$'),
  logradouro text check (length(logradouro) <= 150),
  numero text check (length(numero) <= 20),
  complemento text check (length(complemento) <= 100),
  bairro text check (length(bairro) <= 100),
  cidade text check (length(cidade) <= 100),
  uf text check (uf ~ '^[A-Z]{2}$'),
  observacoes text check (length(observacoes) <= 2000),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, organizacao_id),
  foreign key (cliente_id, organizacao_id)
    references public.clientes (id, organizacao_id) on delete cascade
);

create index locais_atendimento_cliente_id_idx on public.locais_atendimento (cliente_id);
create index locais_atendimento_organizacao_id_idx on public.locais_atendimento (organizacao_id);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null,
  local_id uuid not null,
  identificacao text not null check (length(trim(identificacao)) between 2 and 120),
  tipo public.tipo_equipamento not null,
  marca text check (length(marca) <= 60),
  modelo text check (length(modelo) <= 80),
  capacidade_btu integer check (capacidade_btu between 1 and 10000000),
  numero_serie text check (length(numero_serie) <= 80),
  -- Etiqueta de patrimônio do cliente (comum em hospitais e empresas).
  patrimonio text check (length(patrimonio) <= 40),
  data_instalacao date,
  periodicidade_dias integer check (periodicidade_dias between 1 and 3650),
  proxima_manutencao date,
  observacoes text check (length(observacoes) <= 2000),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, organizacao_id),
  foreign key (local_id, organizacao_id)
    references public.locais_atendimento (id, organizacao_id) on delete cascade
);

create unique index equipamentos_patrimonio_unico
  on public.equipamentos (organizacao_id, patrimonio)
  where patrimonio is not null;
create index equipamentos_local_id_idx on public.equipamentos (local_id);
create index equipamentos_organizacao_id_idx on public.equipamentos (organizacao_id);

-- ---------------------------------------------------------------------------
-- atualizado_em automático (função criada na migration da etapa 0)
-- ---------------------------------------------------------------------------

create trigger definir_atualizado_em before update on public.clientes
  for each row execute function privado.definir_atualizado_em();
create trigger definir_atualizado_em before update on public.locais_atendimento
  for each row execute function privado.definir_atualizado_em();
create trigger definir_atualizado_em before update on public.equipamentos
  for each row execute function privado.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Permissões de tabela e coluna
-- id, organizacao_id e datas nunca são alterados pelo app; o local não muda de cliente.
-- ---------------------------------------------------------------------------

revoke all on public.clientes, public.locais_atendimento, public.equipamentos
  from anon, authenticated;

grant select on public.clientes, public.locais_atendimento, public.equipamentos to authenticated;

grant insert (
  organizacao_id, tipo_pessoa, nome, documento, telefone, email, contato_nome, observacoes, ativo
) on public.clientes to authenticated;
grant update (
  tipo_pessoa, nome, documento, telefone, email, contato_nome, observacoes, ativo
) on public.clientes to authenticated;

grant insert (
  organizacao_id, cliente_id, nome, cep, logradouro, numero, complemento, bairro, cidade, uf,
  observacoes, ativo
) on public.locais_atendimento to authenticated;
grant update (
  nome, cep, logradouro, numero, complemento, bairro, cidade, uf, observacoes, ativo
) on public.locais_atendimento to authenticated;

grant insert (
  organizacao_id, local_id, identificacao, tipo, marca, modelo, capacidade_btu, numero_serie,
  patrimonio, data_instalacao, periodicidade_dias, proxima_manutencao, observacoes, ativo
) on public.equipamentos to authenticated;
grant update (
  local_id, identificacao, tipo, marca, modelo, capacidade_btu, numero_serie, patrimonio,
  data_instalacao, periodicidade_dias, proxima_manutencao, observacoes, ativo
) on public.equipamentos to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.clientes enable row level security;
alter table public.locais_atendimento enable row level security;
alter table public.equipamentos enable row level security;

-- clientes
create policy "membros leem os clientes da organização"
  on public.clientes for select to authenticated
  using (organizacao_id in (select privado.organizacoes_do_usuario()));

create policy "admin e gestor cadastram clientes"
  on public.clientes for insert to authenticated
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));

create policy "admin e gestor alteram clientes"
  on public.clientes for update to authenticated
  using (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]))
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));

-- locais_atendimento
create policy "membros leem os locais da organização"
  on public.locais_atendimento for select to authenticated
  using (organizacao_id in (select privado.organizacoes_do_usuario()));

create policy "admin e gestor cadastram locais"
  on public.locais_atendimento for insert to authenticated
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));

create policy "admin e gestor alteram locais"
  on public.locais_atendimento for update to authenticated
  using (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]))
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));

-- equipamentos
create policy "membros leem os equipamentos da organização"
  on public.equipamentos for select to authenticated
  using (organizacao_id in (select privado.organizacoes_do_usuario()));

create policy "admin e gestor cadastram equipamentos"
  on public.equipamentos for insert to authenticated
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));

create policy "admin e gestor alteram equipamentos"
  on public.equipamentos for update to authenticated
  using (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]))
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));
