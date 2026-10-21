-- Etapa 2: abertura de ordens de serviço (seções 4, 10 e 11 do projeto.md).
--
-- Regras de acesso (RLS), conforme a tabela de permissões da seção 11:
--   ler:    admin e gestor leem todas as OS da organização; técnico só as atribuídas a ele
--   abrir:  admin e gestor
--   editar: admin e gestor, só enquanto a OS não estiver concluída nem cancelada
--   apagar: ninguém (cancelar é uma mudança de status e chega na etapa 3)
--
-- O que o app NÃO consegue gravar direto (sem permissão de coluna):
--   status, técnico e data agendada → mudam só pela Edge Function de status (etapa 3)
--   número, quem abriu e datas      → preenchidos pelo banco
--   histórico (ordem_servico_eventos) → gravado só pelos gatilhos abaixo

create type public.status_ordem as enum (
  'aberta', 'agendada', 'em_execucao', 'pausada', 'concluida', 'cancelada'
);

create type public.prioridade_ordem as enum ('baixa', 'media', 'alta', 'urgente');

create type public.tipo_servico as enum ('corretiva', 'preventiva', 'instalacao', 'outro');

create type public.tipo_evento_ordem as enum ('abertura', 'edicao', 'mudanca_status', 'atribuicao');

-- Para a OS apontar para (local, cliente, empresa) de uma vez: o local precisa ser do cliente.
alter table public.locais_atendimento
  add constraint locais_atendimento_id_cliente_organizacao_key
  unique (id, cliente_id, organizacao_id);

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  -- Número que as pessoas usam ("OS 42"), sequencial dentro de cada empresa.
  numero integer not null,
  cliente_id uuid not null,
  local_id uuid not null,
  tipo_servico public.tipo_servico not null default 'corretiva',
  prioridade public.prioridade_ordem not null default 'media',
  problema text not null check (length(trim(problema)) between 3 and 2000),
  -- Quem pediu o serviço, do lado do cliente (ex.: "Enfermeira Carla, ramal 214").
  solicitante text check (length(solicitante) <= 120),
  status public.status_ordem not null default 'aberta',
  tecnico_id uuid,
  agendada_para timestamptz,
  aberta_por uuid references public.usuarios (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, organizacao_id),
  unique (organizacao_id, numero),
  foreign key (local_id, cliente_id, organizacao_id)
    references public.locais_atendimento (id, cliente_id, organizacao_id),
  foreign key (cliente_id, organizacao_id)
    references public.clientes (id, organizacao_id),
  -- O técnico precisa ser membro da mesma empresa. Se o vínculo for apagado, a OS fica sem técnico.
  foreign key (organizacao_id, tecnico_id)
    references public.organizacao_usuarios (organizacao_id, usuario_id) on delete set null (tecnico_id)
);

create index ordens_servico_organizacao_id_idx on public.ordens_servico (organizacao_id, criado_em desc);
create index ordens_servico_cliente_id_idx on public.ordens_servico (cliente_id);
create index ordens_servico_local_id_idx on public.ordens_servico (local_id);
create index ordens_servico_tecnico_id_idx on public.ordens_servico (tecnico_id);

-- Equipamentos atendidos na OS (uma preventiva pode cobrir vários).
create table public.ordem_servico_equipamentos (
  organizacao_id uuid not null,
  ordem_id uuid not null,
  equipamento_id uuid not null,
  criado_em timestamptz not null default now(),
  primary key (ordem_id, equipamento_id),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade,
  foreign key (equipamento_id, organizacao_id)
    references public.equipamentos (id, organizacao_id)
);

create index ordem_servico_equipamentos_equipamento_id_idx
  on public.ordem_servico_equipamentos (equipamento_id);

-- Histórico da OS: quem fez o quê e quando. Só os gatilhos (e, na etapa 3, a Edge Function) gravam.
create table public.ordem_servico_eventos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null,
  ordem_id uuid not null,
  tipo public.tipo_evento_ordem not null,
  status_anterior public.status_ordem,
  status_novo public.status_ordem,
  -- Resumo legível do que mudou (ex.: campos alterados na edição).
  descricao text check (length(descricao) <= 500),
  usuario_id uuid references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now(),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade
);

create index ordem_servico_eventos_ordem_id_idx on public.ordem_servico_eventos (ordem_id, criado_em);

-- ---------------------------------------------------------------------------
-- Número da OS: contador por empresa, fora da API
-- A linha do contador fica travada até o fim da transação, então duas OS abertas
-- ao mesmo tempo nunca recebem o mesmo número.
-- ---------------------------------------------------------------------------

create table privado.contadores_ordem (
  organizacao_id uuid primary key references public.organizacoes (id) on delete cascade,
  ultimo_numero integer not null
);

create function privado.numerar_ordem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into privado.contadores_ordem as contador (organizacao_id, ultimo_numero)
  values (new.organizacao_id, 1)
  on conflict (organizacao_id) do update set ultimo_numero = contador.ultimo_numero + 1
  returning ultimo_numero into new.numero;
  return new;
end;
$$;

create trigger numerar_ordem before insert on public.ordens_servico
  for each row execute function privado.numerar_ordem();

create trigger definir_atualizado_em before update on public.ordens_servico
  for each row execute function privado.definir_atualizado_em();

-- ---------------------------------------------------------------------------
-- Histórico automático de abertura e edição
-- Fica no banco para não depender do navegador: ninguém abre ou edita uma OS sem deixar rastro.
-- ---------------------------------------------------------------------------

create function privado.registrar_abertura_ordem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ordem_servico_eventos (organizacao_id, ordem_id, tipo, status_novo, usuario_id)
  values (new.organizacao_id, new.id, 'abertura', new.status, (select auth.uid()));
  return new;
end;
$$;

create trigger registrar_abertura_ordem after insert on public.ordens_servico
  for each row execute function privado.registrar_abertura_ordem();

create function privado.registrar_edicao_ordem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  alterados text[] := '{}';
begin
  if new.cliente_id is distinct from old.cliente_id then alterados := array_append(alterados, 'cliente'); end if;
  if new.local_id is distinct from old.local_id then alterados := array_append(alterados, 'local'); end if;
  if new.tipo_servico is distinct from old.tipo_servico then alterados := array_append(alterados, 'tipo de serviço'); end if;
  if new.prioridade is distinct from old.prioridade then alterados := array_append(alterados, 'prioridade'); end if;
  if new.problema is distinct from old.problema then alterados := array_append(alterados, 'problema'); end if;
  if new.solicitante is distinct from old.solicitante then alterados := array_append(alterados, 'solicitante'); end if;
  -- Avisado por editar_ordem_servico, que troca os equipamentos na mesma transação.
  if current_setting('airops.equipamentos_alterados', true) = 'sim' then
    alterados := array_append(alterados, 'equipamentos');
  end if;

  if cardinality(alterados) > 0 then
    insert into public.ordem_servico_eventos (organizacao_id, ordem_id, tipo, descricao, usuario_id)
    values (
      new.organizacao_id, new.id, 'edicao',
      'Alterado: ' || array_to_string(alterados, ', '), (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger registrar_edicao_ordem after update on public.ordens_servico
  for each row execute function privado.registrar_edicao_ordem();

-- ---------------------------------------------------------------------------
-- Permissões de tabela e coluna
-- ---------------------------------------------------------------------------

revoke all on public.ordens_servico, public.ordem_servico_equipamentos, public.ordem_servico_eventos
  from anon, authenticated;

grant select on public.ordens_servico, public.ordem_servico_equipamentos, public.ordem_servico_eventos
  to authenticated;

grant insert (
  organizacao_id, cliente_id, local_id, tipo_servico, prioridade, problema, solicitante
) on public.ordens_servico to authenticated;
grant update (
  cliente_id, local_id, tipo_servico, prioridade, problema, solicitante
) on public.ordens_servico to authenticated;

grant insert (organizacao_id, ordem_id, equipamento_id), delete
  on public.ordem_servico_equipamentos to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ordens_servico enable row level security;
alter table public.ordem_servico_equipamentos enable row level security;
alter table public.ordem_servico_eventos enable row level security;

-- ordens_servico
create policy "admin e gestor leem as OS; técnico, as atribuídas a ele"
  on public.ordens_servico for select to authenticated
  using (
    privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[])
    or (
      tecnico_id = (select auth.uid())
      and organizacao_id in (select privado.organizacoes_do_usuario())
    )
  );

create policy "admin e gestor abrem OS"
  on public.ordens_servico for insert to authenticated
  with check (privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[]));

create policy "admin e gestor editam OS que não terminaram"
  on public.ordens_servico for update to authenticated
  using (
    status not in ('concluida', 'cancelada')
    and privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[])
  )
  with check (
    status not in ('concluida', 'cancelada')
    and privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[])
  );

-- ordem_servico_equipamentos: segue quem pode ler e editar a OS.
-- O "exists" passa pelo RLS de ordens_servico, então o técnico só vê os das OS dele.
create policy "quem lê a OS lê os equipamentos dela"
  on public.ordem_servico_equipamentos for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = ordem_servico_equipamentos.ordem_id));

create policy "admin e gestor ligam equipamentos a OS que não terminaram"
  on public.ordem_servico_equipamentos for insert to authenticated
  with check (
    privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[])
    and exists (
      select 1 from public.ordens_servico o
      where o.id = ordem_servico_equipamentos.ordem_id and o.status not in ('concluida', 'cancelada')
    )
  );

create policy "admin e gestor desligam equipamentos de OS que não terminaram"
  on public.ordem_servico_equipamentos for delete to authenticated
  using (
    privado.tem_papel(organizacao_id, array['admin', 'gestor']::public.papel_usuario[])
    and exists (
      select 1 from public.ordens_servico o
      where o.id = ordem_servico_equipamentos.ordem_id and o.status not in ('concluida', 'cancelada')
    )
  );

-- ordem_servico_eventos
create policy "quem lê a OS lê o histórico dela"
  on public.ordem_servico_eventos for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = ordem_servico_eventos.ordem_id));

-- ---------------------------------------------------------------------------
-- Abrir e editar numa única transação
-- Gravam a OS e os equipamentos juntos: se uma parte falhar, nada fica pela metade.
-- security invoker: rodam com as permissões de quem chamou, passando pelo RLS acima.
-- Não têm regra de negócio (essa fica em src/domain/ordem/); só agrupam as gravações.
-- ---------------------------------------------------------------------------

create function public.abrir_ordem_servico(
  p_organizacao_id uuid,
  p_cliente_id uuid,
  p_local_id uuid,
  p_tipo_servico public.tipo_servico,
  p_prioridade public.prioridade_ordem,
  p_problema text,
  p_solicitante text,
  p_equipamento_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  nova_id uuid;
begin
  insert into public.ordens_servico
    (organizacao_id, cliente_id, local_id, tipo_servico, prioridade, problema, solicitante)
  values
    (p_organizacao_id, p_cliente_id, p_local_id, p_tipo_servico, p_prioridade, p_problema, p_solicitante)
  returning id into nova_id;

  insert into public.ordem_servico_equipamentos (organizacao_id, ordem_id, equipamento_id)
  select p_organizacao_id, nova_id, equipamento_id
  from unnest(coalesce(p_equipamento_ids, '{}')) as equipamento_id;

  return nova_id;
end;
$$;

create function public.editar_ordem_servico(
  p_id uuid,
  p_cliente_id uuid,
  p_local_id uuid,
  p_tipo_servico public.tipo_servico,
  p_prioridade public.prioridade_ordem,
  p_problema text,
  p_solicitante text,
  p_equipamento_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  organizacao uuid;
  novos uuid[] := coalesce(p_equipamento_ids, '{}');
  atuais uuid[];
begin
  select coalesce(array_agg(equipamento_id), '{}') into atuais
  from public.ordem_servico_equipamentos
  where ordem_id = p_id;

  -- O gatilho de histórico lê este aviso para incluir "equipamentos" no que mudou.
  perform set_config(
    'airops.equipamentos_alterados',
    case when atuais @> novos and novos @> atuais then 'nao' else 'sim' end,
    true
  );

  update public.ordens_servico
  set cliente_id = p_cliente_id,
      local_id = p_local_id,
      tipo_servico = p_tipo_servico,
      prioridade = p_prioridade,
      problema = p_problema,
      solicitante = p_solicitante
  where id = p_id
  returning organizacao_id into organizacao;

  -- Nenhuma linha alterada: a OS não existe, é de outra empresa, terminou ou falta permissão.
  if organizacao is null then
    raise exception 'OS não encontrada ou sem permissão para editar'
      using errcode = '42501';
  end if;

  delete from public.ordem_servico_equipamentos
  where ordem_id = p_id
    and equipamento_id <> all (novos);

  insert into public.ordem_servico_equipamentos (organizacao_id, ordem_id, equipamento_id)
  select organizacao, p_id, equipamento_id
  from unnest(novos) as equipamento_id
  on conflict (ordem_id, equipamento_id) do nothing;
end;
$$;

revoke all on function public.abrir_ordem_servico(
  uuid, uuid, uuid, public.tipo_servico, public.prioridade_ordem, text, text, uuid[]
) from public, anon;
revoke all on function public.editar_ordem_servico(
  uuid, uuid, uuid, public.tipo_servico, public.prioridade_ordem, text, text, uuid[]
) from public, anon;
grant execute on function public.abrir_ordem_servico(
  uuid, uuid, uuid, public.tipo_servico, public.prioridade_ordem, text, text, uuid[]
) to authenticated;
grant execute on function public.editar_ordem_servico(
  uuid, uuid, uuid, public.tipo_servico, public.prioridade_ordem, text, text, uuid[]
) to authenticated;
