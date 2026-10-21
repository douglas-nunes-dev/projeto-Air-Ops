-- Etapa 4: execução da OS no celular — checklist, diagnóstico, atividades, materiais e fotos
-- (seções 4, 10 e 11 do projeto.md).
--
-- Quem registra (decisão da etapa 4): só o técnico atribuído à OS, enquanto ela está em execução.
-- Fotos também com a OS pausada, para a fila do celular terminar de enviar depois de pausar.
-- Admin e gestor acompanham (leem) tudo, sem alterar.
--
-- Iniciar, pausar e retomar são mudanças de status: passam pela Edge Function
-- "alterar-status-ordem" (seção 11). O tempo trabalhado não é gravado: é calculado a partir
-- desses eventos, em TypeScript (src/domain/ordem/execucao.ts).

create type public.resposta_checklist as enum ('ok', 'nao_conforme', 'nao_se_aplica');

-- ---------------------------------------------------------------------------
-- Função usada pelas políticas: a pessoa logada é o técnico desta OS, e ela está num dos status?
-- security definer: lê a OS e o vínculo sem depender do RLS de quem chama.
-- ---------------------------------------------------------------------------

create function privado.registra_execucao(ordem uuid, status_aceitos public.status_ordem[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ordens_servico o
    where o.id = ordem
      and o.tecnico_id = (select auth.uid())
      and o.status = any (status_aceitos)
      and privado.tem_papel(o.organizacao_id, array['tecnico']::public.papel_usuario[])
  );
$$;

revoke all on function privado.registra_execucao(uuid, public.status_ordem[]) from public;
grant execute on function privado.registra_execucao(uuid, public.status_ordem[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Modelos de checklist: um por tipo de serviço em cada empresa.
-- Cada empresa nasce com os modelos padrão; a tela para editá-los chega em Configurações.
-- ---------------------------------------------------------------------------

create table public.checklist_modelos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  tipo_servico public.tipo_servico not null,
  nome text not null check (length(trim(nome)) between 2 and 120),
  -- Na ordem em que aparecem para o técnico.
  itens text[] not null check (cardinality(itens) between 1 and 60),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organizacao_id, tipo_servico)
);

create trigger definir_atualizado_em before update on public.checklist_modelos
  for each row execute function privado.definir_atualizado_em();

create function privado.criar_checklists_padrao(organizacao uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.checklist_modelos (organizacao_id, tipo_servico, nome, itens)
  values
    (organizacao, 'preventiva', 'Preventiva — ar-condicionado split', array[
      'Limpeza dos filtros de ar',
      'Limpeza da serpentina da evaporadora',
      'Limpeza da bandeja e desobstrução do dreno',
      'Limpeza da condensadora',
      'Higienização com produto bactericida',
      'Verificação de ruídos e vibrações',
      'Isolamento térmico das tubulações em bom estado',
      'Aperto e inspeção das conexões elétricas',
      'Medição da corrente elétrica do compressor',
      'Medição da temperatura do ar insuflado',
      'Verificação de vazamentos de fluido refrigerante',
      'Teste do controle remoto ou termostato'
    ]),
    (organizacao, 'corretiva', 'Corretiva', array[
      'Defeito relatado confirmado no local',
      'Alimentação elétrica verificada',
      'Verificação de vazamentos de fluido refrigerante',
      'Teste de funcionamento após o reparo',
      'Local limpo e organizado ao final'
    ]),
    (organizacao, 'instalacao', 'Instalação', array[
      'Local de instalação aprovado pelo cliente',
      'Suportes e fixação firmes',
      'Tubulação com isolamento térmico',
      'Dreno com caimento e destino adequados',
      'Teste de estanqueidade (vazamento)',
      'Vácuo na tubulação',
      'Ligação elétrica conforme o manual (disjuntor e bitola)',
      'Teste de funcionamento e temperatura',
      'Orientação de uso passada ao cliente'
    ])
  on conflict (organizacao_id, tipo_servico) do nothing;
$$;

revoke all on function privado.criar_checklists_padrao(uuid) from public;

-- Empresas que já existem...
select privado.criar_checklists_padrao(id) from public.organizacoes;

-- ...e as que forem criadas depois.
create function privado.ao_criar_organizacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.criar_checklists_padrao(new.id);
  return new;
end;
$$;

create trigger criar_checklists_padrao after insert on public.organizacoes
  for each row execute function privado.ao_criar_organizacao();

-- ---------------------------------------------------------------------------
-- Respostas do checklist de cada OS.
-- Os itens são COPIADOS do modelo ao preparar o checklist: se o modelo mudar depois,
-- o registro das OS antigas continua igual ao que o técnico viu (rastreabilidade).
-- ---------------------------------------------------------------------------

create table public.checklist_respostas (
  organizacao_id uuid not null,
  ordem_id uuid not null,
  posicao smallint not null check (posicao between 1 and 60),
  item text not null check (length(item) between 1 and 200),
  -- null = ainda não respondido.
  resposta public.resposta_checklist,
  observacao text check (length(observacao) <= 500),
  respondido_por uuid references public.usuarios (id) on delete set null,
  respondido_em timestamptz,
  primary key (ordem_id, posicao),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade
);

-- Quem respondeu e quando vêm do banco, não do navegador.
create function privado.registrar_resposta_checklist()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.respondido_por := (select auth.uid());
  new.respondido_em := now();
  return new;
end;
$$;

create trigger registrar_resposta_checklist before update on public.checklist_respostas
  for each row execute function privado.registrar_resposta_checklist();

-- Copia os itens do modelo do tipo de serviço da OS. Não faz nada se já houver checklist.
-- security definer porque o app não tem permissão de inserir itens (só de responder).
create function public.preparar_checklist(p_ordem_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.registra_execucao(p_ordem_id, array['em_execucao']::public.status_ordem[]) then
    raise exception 'Só o técnico da OS, com ela em execução, prepara o checklist'
      using errcode = '42501';
  end if;

  insert into public.checklist_respostas (organizacao_id, ordem_id, posicao, item)
  select o.organizacao_id, o.id, item.posicao, item.texto
  from public.ordens_servico o
  join public.checklist_modelos m
    on m.organizacao_id = o.organizacao_id and m.tipo_servico = o.tipo_servico
  cross join lateral unnest(m.itens) with ordinality as item (texto, posicao)
  where o.id = p_ordem_id
    and not exists (select 1 from public.checklist_respostas r where r.ordem_id = p_ordem_id)
  on conflict (ordem_id, posicao) do nothing;
end;
$$;

revoke all on function public.preparar_checklist(uuid) from public, anon;
grant execute on function public.preparar_checklist(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Anotações da execução: diagnóstico e materiais (texto livre no MVP, seção 3).
-- ---------------------------------------------------------------------------

create table public.ordem_servico_execucao (
  ordem_id uuid primary key,
  organizacao_id uuid not null,
  diagnostico text check (length(diagnostico) <= 4000),
  materiais text check (length(materiais) <= 2000),
  atualizado_por uuid references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade
);

create function privado.registrar_autor_execucao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_por := (select auth.uid());
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger registrar_autor_execucao before insert or update on public.ordem_servico_execucao
  for each row execute function privado.registrar_autor_execucao();

-- ---------------------------------------------------------------------------
-- Atividades executadas (o tempo vem dos eventos de iniciar e pausar).
-- ---------------------------------------------------------------------------

create table public.ordem_servico_itens (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null,
  ordem_id uuid not null,
  descricao text not null check (length(trim(descricao)) between 3 and 500),
  criado_por uuid references public.usuarios (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade
);

create index ordem_servico_itens_ordem_id_idx on public.ordem_servico_itens (ordem_id, criado_em);

-- ---------------------------------------------------------------------------
-- Fotos: a imagem fica no Storage (bucket privado "anexos"); aqui, só o caminho (regra 9).
-- O id é gerado no celular: se o envio cair e for repetido, não duplica.
-- ---------------------------------------------------------------------------

create table public.anexos (
  id uuid primary key,
  organizacao_id uuid not null,
  ordem_id uuid not null,
  -- Sempre "empresa/OS/id.jpg": o celular reduz e converte as fotos para JPEG antes de enviar.
  caminho text not null unique
    constraint anexos_caminho_padrao check (caminho = organizacao_id::text || '/' || ordem_id::text || '/' || id::text || '.jpg'),
  legenda text check (length(legenda) <= 200),
  tamanho_bytes integer not null check (tamanho_bytes between 1 and 10485760),
  -- Hora em que a foto foi tirada (pode ser bem antes do envio, se o sinal estava ruim).
  tirada_em timestamptz not null,
  criado_por uuid references public.usuarios (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade
);

create index anexos_ordem_id_idx on public.anexos (ordem_id, tirada_em);

-- ---------------------------------------------------------------------------
-- Permissões de tabela e coluna
-- ---------------------------------------------------------------------------

revoke all on public.checklist_modelos, public.checklist_respostas, public.ordem_servico_execucao,
  public.ordem_servico_itens, public.anexos
  from anon, authenticated;

grant select on public.checklist_modelos, public.checklist_respostas, public.ordem_servico_execucao,
  public.ordem_servico_itens, public.anexos
  to authenticated;

grant update (nome, itens) on public.checklist_modelos to authenticated;
grant update (resposta, observacao) on public.checklist_respostas to authenticated;
grant insert (ordem_id, organizacao_id, diagnostico, materiais) on public.ordem_servico_execucao
  to authenticated;
grant update (diagnostico, materiais) on public.ordem_servico_execucao to authenticated;
grant insert (organizacao_id, ordem_id, descricao), delete on public.ordem_servico_itens
  to authenticated;
grant insert (id, organizacao_id, ordem_id, caminho, legenda, tamanho_bytes, tirada_em), delete
  on public.anexos to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.checklist_modelos enable row level security;
alter table public.checklist_respostas enable row level security;
alter table public.ordem_servico_execucao enable row level security;
alter table public.ordem_servico_itens enable row level security;
alter table public.anexos enable row level security;

-- checklist_modelos
create policy "membros leem os modelos de checklist"
  on public.checklist_modelos for select to authenticated
  using (organizacao_id in (select privado.organizacoes_do_usuario()));

create policy "admin altera os modelos de checklist"
  on public.checklist_modelos for update to authenticated
  using (privado.tem_papel(organizacao_id, array['admin']::public.papel_usuario[]))
  with check (privado.tem_papel(organizacao_id, array['admin']::public.papel_usuario[]));

-- Leitura: quem lê a OS lê a execução dela (o "exists" passa pelo RLS de ordens_servico).
create policy "quem lê a OS lê o checklist dela"
  on public.checklist_respostas for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = checklist_respostas.ordem_id));

create policy "técnico da OS responde o checklist durante a execução"
  on public.checklist_respostas for update to authenticated
  using (privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[]))
  with check (privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[]));

-- ordem_servico_execucao
create policy "quem lê a OS lê as anotações da execução"
  on public.ordem_servico_execucao for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = ordem_servico_execucao.ordem_id));

create policy "técnico da OS cria as anotações durante a execução"
  on public.ordem_servico_execucao for insert to authenticated
  with check (privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[]));

create policy "técnico da OS altera as anotações durante a execução"
  on public.ordem_servico_execucao for update to authenticated
  using (privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[]))
  with check (privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[]));

-- ordem_servico_itens
create policy "quem lê a OS lê as atividades"
  on public.ordem_servico_itens for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = ordem_servico_itens.ordem_id));

create policy "técnico da OS registra atividades durante a execução"
  on public.ordem_servico_itens for insert to authenticated
  with check (privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[]));

create policy "técnico apaga as próprias atividades durante a execução"
  on public.ordem_servico_itens for delete to authenticated
  using (
    criado_por = (select auth.uid())
    and privado.registra_execucao(ordem_id, array['em_execucao']::public.status_ordem[])
  );

-- anexos
create policy "quem lê a OS lê as fotos"
  on public.anexos for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = anexos.ordem_id));

create policy "técnico da OS registra fotos em execução ou pausada"
  on public.anexos for insert to authenticated
  with check (
    privado.registra_execucao(ordem_id, array['em_execucao', 'pausada']::public.status_ordem[])
  );

create policy "técnico apaga as próprias fotos em execução ou pausada"
  on public.anexos for delete to authenticated
  using (
    criado_por = (select auth.uid())
    and privado.registra_execucao(ordem_id, array['em_execucao', 'pausada']::public.status_ordem[])
  );

-- ---------------------------------------------------------------------------
-- Storage: bucket privado e políticas por OS (seção 11, "Arquivos").
-- Caminho: "<empresa>/<OS>/<id>.jpg". Leitura só por URL assinada de validade curta.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 10485760, array['image/jpeg'])
on conflict (id) do nothing;

-- O caminho tem o formato certo e aponta para uma OS que a pessoa está executando?
create function privado.pode_enviar_foto(caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select caminho ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    and exists (
      select 1
      from public.ordens_servico o
      where o.organizacao_id::text = split_part(caminho, '/', 1)
        and o.id::text = split_part(caminho, '/', 2)
        and privado.registra_execucao(o.id, array['em_execucao', 'pausada']::public.status_ordem[])
    );
$$;

revoke all on function privado.pode_enviar_foto(text) from public;
grant execute on function privado.pode_enviar_foto(text) to authenticated;

create policy "técnico envia fotos da OS em execução"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos' and privado.pode_enviar_foto(name));

create policy "técnico apaga fotos da OS em execução"
  on storage.objects for delete to authenticated
  using (bucket_id = 'anexos' and privado.pode_enviar_foto(name));

-- Passa pelo RLS de ordens_servico: técnico só vê as fotos das OS dele.
create policy "quem lê a OS vê as fotos dela"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'anexos'
    and exists (
      select 1 from public.ordens_servico o where o.id::text = split_part(name, '/', 2)
    )
  );
