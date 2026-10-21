-- Etapa 3: planejamento da OS — agendar, reagendar, atribuir técnico e cancelar (seções 4 e 11).
--
-- Mudança de status é operação sensível (seção 11): o app não grava status, técnico nem data.
-- Quem grava é a Edge Function "alterar-status-ordem", que confere papel e transição usando
-- src/domain/ordem/transicoes.ts e chama registrar_mudanca_status com a chave de serviço.
-- Esta migration só guarda os dados e bloqueia o que não pode; a regra fica em TypeScript.

alter type public.tipo_evento_ordem add value if not exists 'reagendamento';

alter table public.ordens_servico
  -- Tempo previsto do atendimento, para montar a agenda.
  add column duracao_minutos integer not null default 60
    check (duracao_minutos between 15 and 720),
  add column motivo_cancelamento text check (length(motivo_cancelamento) <= 500);

-- Garantias mínimas, mesmo que alguém grave com a chave de serviço por engano:
-- OS agendada sempre tem técnico e horário; OS cancelada sempre tem motivo.
alter table public.ordens_servico
  add constraint ordens_servico_agendada_completa
    check (status <> 'agendada' or (tecnico_id is not null and agendada_para is not null)),
  add constraint ordens_servico_cancelada_com_motivo
    check (status <> 'cancelada' or motivo_cancelamento is not null);

create index ordens_servico_agenda_idx
  on public.ordens_servico (organizacao_id, agendada_para)
  where agendada_para is not null;

-- ---------------------------------------------------------------------------
-- Gravação da mudança de status: OS e histórico numa única transação
-- Só a chave de serviço (Edge Function) executa. "p_status_esperado" evita que duas
-- pessoas mudem a mesma OS ao mesmo tempo: se o status mudou no meio, nada é gravado.
-- ---------------------------------------------------------------------------

create function public.registrar_mudanca_status(
  p_ordem_id uuid,
  p_status_esperado public.status_ordem,
  p_status_novo public.status_ordem,
  p_tecnico_id uuid,
  p_agendada_para timestamptz,
  p_duracao_minutos integer,
  p_motivo_cancelamento text,
  p_tipo_evento public.tipo_evento_ordem,
  p_descricao text,
  p_usuario_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  organizacao uuid;
begin
  update public.ordens_servico
  set status = p_status_novo,
      tecnico_id = p_tecnico_id,
      agendada_para = p_agendada_para,
      duracao_minutos = coalesce(p_duracao_minutos, duracao_minutos),
      motivo_cancelamento = p_motivo_cancelamento
  where id = p_ordem_id and status = p_status_esperado
  returning organizacao_id into organizacao;

  if organizacao is null then
    raise exception 'A OS mudou enquanto você editava. Recarregue a página e tente de novo.'
      using errcode = '55000';
  end if;

  insert into public.ordem_servico_eventos
    (organizacao_id, ordem_id, tipo, status_anterior, status_novo, descricao, usuario_id)
  values
    (organizacao, p_ordem_id, p_tipo_evento, p_status_esperado, p_status_novo, p_descricao, p_usuario_id);
end;
$$;

revoke all on function public.registrar_mudanca_status(
  uuid, public.status_ordem, public.status_ordem, uuid, timestamptz, integer, text,
  public.tipo_evento_ordem, text, uuid
) from public, anon, authenticated;
grant execute on function public.registrar_mudanca_status(
  uuid, public.status_ordem, public.status_ordem, uuid, timestamptz, integer, text,
  public.tipo_evento_ordem, text, uuid
) to service_role;
