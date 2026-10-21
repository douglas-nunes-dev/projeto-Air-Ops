-- Etapa 5: conclusão da OS — assinatura do cliente e encerramento (seções 4, 10 e 11).
--
-- Decisões da etapa 5:
--   - o técnico da OS conclui direto (sem aprovação do gestor);
--   - para concluir: diagnóstico preenchido, pelo menos uma foto e a assinatura do cliente
--     (ou o motivo de não haver assinatura, ex.: responsável ausente).
-- Essas regras ficam em TypeScript, na Edge Function "alterar-status-ordem" (regra 12).
-- Aqui: a tabela da assinatura e a gravação da conclusão numa única transação.

-- ---------------------------------------------------------------------------
-- Assinatura: uma por OS, gravada só na conclusão e nunca alterada depois (seção 11).
-- A imagem fica no bucket "anexos" (JPEG), na pasta da OS; aqui, só o caminho (regra 9).
-- ---------------------------------------------------------------------------

create table public.assinaturas (
  ordem_id uuid primary key,
  organizacao_id uuid not null,
  nome_assinante text check (length(trim(nome_assinante)) between 2 and 120),
  caminho text,
  -- Preenchido quando o cliente não pôde assinar.
  motivo_sem_assinatura text check (length(trim(motivo_sem_assinatura)) between 5 and 300),
  usuario_id uuid references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Ou tem assinatura (imagem + nome), ou tem o motivo de não ter.
  constraint assinaturas_completa check (
    (caminho is not null and nome_assinante is not null and motivo_sem_assinatura is null)
    or (caminho is null and nome_assinante is null and motivo_sem_assinatura is not null)
  ),
  constraint assinaturas_caminho_padrao check (
    caminho is null
    or caminho ~ ('^' || organizacao_id::text || '/' || ordem_id::text || '/[0-9a-f-]{36}\.jpg$')
  ),
  foreign key (ordem_id, organizacao_id)
    references public.ordens_servico (id, organizacao_id) on delete cascade
);

revoke all on public.assinaturas from anon, authenticated;
grant select on public.assinaturas to authenticated;

alter table public.assinaturas enable row level security;

create policy "quem lê a OS lê a assinatura"
  on public.assinaturas for select to authenticated
  using (exists (select 1 from public.ordens_servico o where o.id = assinaturas.ordem_id));

-- ---------------------------------------------------------------------------
-- Gravação da conclusão: status, assinatura e histórico juntos (ou tudo, ou nada).
-- Só a chave de serviço (Edge Function) executa. Exige a OS ainda em execução: se outra
-- pessoa mexeu nela no meio do caminho, nada é gravado.
-- ---------------------------------------------------------------------------

create function public.registrar_conclusao(
  p_ordem_id uuid,
  p_usuario_id uuid,
  p_nome_assinante text,
  p_caminho_assinatura text,
  p_motivo_sem_assinatura text,
  p_descricao text
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
end;
$$;

revoke all on function public.registrar_conclusao(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.registrar_conclusao(uuid, uuid, text, text, text, text)
  to service_role;
