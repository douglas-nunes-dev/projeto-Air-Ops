-- Etapa 6: histórico de atendimentos por equipamento e por cliente (seções 6 e 10).
--
-- Decisões da etapa 6:
--   - no histórico do EQUIPAMENTO, o técnico vê os atendimentos de todos os técnicos, mas só
--     em resumo (data, tipo, status, quem atendeu, diagnóstico e contagens). Ele continua sem
--     abrir as OS dos outros: fotos, assinatura e detalhes seguem protegidos pelo RLS;
--   - no histórico do CLIENTE vale o RLS normal: técnico vê as OS dele; admin e gestor, todas.
-- Aqui só há consulta (sem regra de negócio): o resumo e o filtro de quem pode ver.

-- ---------------------------------------------------------------------------
-- Resumo de cada OS para a linha do tempo. Fica no schema privado (a API não expõe) e
-- respeita o RLS de quem consulta (security_invoker), a não ser quando usado por uma
-- função security definer, que então faz a própria checagem.
-- ---------------------------------------------------------------------------

create view privado.resumo_ordens with (security_invoker = true) as
select
  o.id as ordem_id,
  o.organizacao_id,
  o.numero,
  o.cliente_id,
  o.local_id,
  l.nome as local_nome,
  o.tipo_servico,
  o.status,
  o.problema,
  o.tecnico_id,
  coalesce(nullif(trim(u.nome), ''), u.email) as tecnico_nome,
  o.agendada_para,
  o.criado_em,
  (
    select e.criado_em
    from public.ordem_servico_eventos e
    where e.ordem_id = o.id and e.status_novo = 'concluida'
    order by e.criado_em desc
    limit 1
  ) as concluida_em,
  x.diagnostico,
  (select count(*)::integer from public.anexos a where a.ordem_id = o.id) as fotos,
  (
    select count(*)::integer
    from public.checklist_respostas r
    where r.ordem_id = o.id and r.resposta = 'nao_conforme'
  ) as nao_conformes
from public.ordens_servico o
join public.locais_atendimento l on l.id = o.local_id
left join public.usuarios u on u.id = o.tecnico_id
left join public.ordem_servico_execucao x on x.ordem_id = o.id;

revoke all on privado.resumo_ordens from public, anon, authenticated;
grant select on privado.resumo_ordens to authenticated;

-- ---------------------------------------------------------------------------
-- Histórico do equipamento: todos os atendimentos, para qualquer membro ativo da empresa
-- do equipamento (decisão da etapa 6). security definer: enxerga além do RLS do técnico,
-- por isso confere a empresa ANTES e devolve só as colunas de resumo.
-- ---------------------------------------------------------------------------

create function public.historico_do_equipamento(p_equipamento_id uuid)
returns table (
  ordem_id uuid,
  numero integer,
  local_nome text,
  tipo_servico public.tipo_servico,
  status public.status_ordem,
  problema text,
  tecnico_id uuid,
  tecnico_nome text,
  agendada_para timestamptz,
  criado_em timestamptz,
  concluida_em timestamptz,
  diagnostico text,
  fotos integer,
  nao_conformes integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.ordem_id, r.numero, r.local_nome, r.tipo_servico, r.status, r.problema, r.tecnico_id,
    r.tecnico_nome, r.agendada_para, r.criado_em, r.concluida_em, r.diagnostico, r.fotos,
    r.nao_conformes
  from privado.resumo_ordens r
  join public.ordem_servico_equipamentos oe on oe.ordem_id = r.ordem_id
  join public.equipamentos eq on eq.id = oe.equipamento_id
  where oe.equipamento_id = p_equipamento_id
    and eq.organizacao_id in (select privado.organizacoes_do_usuario())
  order by coalesce(r.concluida_em, r.agendada_para, r.criado_em) desc;
$$;

-- ---------------------------------------------------------------------------
-- Histórico do cliente: segue o RLS de quem consulta (security invoker).
-- ---------------------------------------------------------------------------

create function public.historico_do_cliente(p_cliente_id uuid)
returns table (
  ordem_id uuid,
  numero integer,
  local_nome text,
  tipo_servico public.tipo_servico,
  status public.status_ordem,
  problema text,
  tecnico_id uuid,
  tecnico_nome text,
  agendada_para timestamptz,
  criado_em timestamptz,
  concluida_em timestamptz,
  diagnostico text,
  fotos integer,
  nao_conformes integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.ordem_id, r.numero, r.local_nome, r.tipo_servico, r.status, r.problema, r.tecnico_id,
    r.tecnico_nome, r.agendada_para, r.criado_em, r.concluida_em, r.diagnostico, r.fotos,
    r.nao_conformes
  from privado.resumo_ordens r
  where r.cliente_id = p_cliente_id
  order by coalesce(r.concluida_em, r.agendada_para, r.criado_em) desc;
$$;

revoke all on function public.historico_do_equipamento(uuid) from public, anon;
revoke all on function public.historico_do_cliente(uuid) from public, anon;
grant execute on function public.historico_do_equipamento(uuid) to authenticated;
grant execute on function public.historico_do_cliente(uuid) to authenticated;
