-- Etapa 4 (correção): salvar diagnóstico e materiais.
--
-- O "upsert" do app gerava "on conflict do update" em TODAS as colunas enviadas, inclusive
-- ordem_id e organizacao_id, que o app não tem permissão de alterar: o banco recusava
-- ("permission denied") a partir do segundo salvamento — e já no primeiro, porque o Postgres
-- confere a permissão do "do update" antes de gravar.
-- Esta função grava só as duas colunas de texto. security invoker: passa pelo RLS de quem
-- chama (só o técnico da OS, com ela em execução). A empresa vem da própria OS.

create function public.salvar_anotacoes_execucao(
  p_ordem_id uuid,
  p_diagnostico text,
  p_materiais text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  gravadas integer;
begin
  insert into public.ordem_servico_execucao (ordem_id, organizacao_id, diagnostico, materiais)
  select o.id, o.organizacao_id, p_diagnostico, p_materiais
  from public.ordens_servico o
  where o.id = p_ordem_id
  on conflict (ordem_id) do update
    set diagnostico = excluded.diagnostico,
        materiais = excluded.materiais;

  get diagnostics gravadas = row_count;
  -- Nenhuma linha: a OS não existe ou a pessoa não enxerga esta OS.
  if gravadas = 0 then
    raise exception 'OS não encontrada' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.salvar_anotacoes_execucao(uuid, text, text) from public, anon;
grant execute on function public.salvar_anotacoes_execucao(uuid, text, text) to authenticated;
