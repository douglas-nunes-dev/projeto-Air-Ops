-- Etapa 8: preventiva simples — próxima manutenção atualizada ao concluir uma preventiva.
--
-- Decisão da etapa 8: a próxima conta a partir da última feita ("data da conclusão +
-- periodicidade"). O cálculo fica em TypeScript (src/domain/equipamento/preventiva.ts), na
-- Edge Function que conclui a OS (regra 12); aqui a conclusão só passa a gravar as datas
-- recebidas, na mesma transação do status, da assinatura e do histórico.

drop function public.registrar_conclusao(uuid, uuid, text, text, text, text);

create function public.registrar_conclusao(
  p_ordem_id uuid,
  p_usuario_id uuid,
  p_nome_assinante text,
  p_caminho_assinatura text,
  p_motivo_sem_assinatura text,
  p_descricao text,
  -- [{ "equipamento_id": "...", "proxima_manutencao": "AAAA-MM-DD" }, ...]; vazio fora da preventiva.
  p_proximas_manutencoes jsonb
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
  set status = 'concluida'
  where id = p_ordem_id and status = 'em_execucao'
  returning organizacao_id into organizacao;

  if organizacao is null then
    raise exception 'A OS mudou enquanto você concluía. Recarregue a página e tente de novo.'
      using errcode = '55000';
  end if;

  insert into public.assinaturas
    (ordem_id, organizacao_id, nome_assinante, caminho, motivo_sem_assinatura, usuario_id)
  values
    (p_ordem_id, organizacao, p_nome_assinante, p_caminho_assinatura, p_motivo_sem_assinatura,
     p_usuario_id);

  insert into public.ordem_servico_eventos
    (organizacao_id, ordem_id, tipo, status_anterior, status_novo, descricao, usuario_id)
  values
    (organizacao, p_ordem_id, 'mudanca_status', 'em_execucao', 'concluida', p_descricao,
     p_usuario_id);

  -- Só equipamentos desta OS (e da mesma empresa): uma data enviada para outro é ignorada.
  update public.equipamentos e
  set proxima_manutencao = (item ->> 'proxima_manutencao')::date
  from jsonb_array_elements(coalesce(p_proximas_manutencoes, '[]'::jsonb)) as item
  where e.id = (item ->> 'equipamento_id')::uuid
    and e.organizacao_id = organizacao
    and exists (
      select 1
      from public.ordem_servico_equipamentos oe
      where oe.ordem_id = p_ordem_id and oe.equipamento_id = e.id
    );
end;
$$;

revoke all on function public.registrar_conclusao(uuid, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.registrar_conclusao(uuid, uuid, text, text, text, text, jsonb)
  to service_role;
