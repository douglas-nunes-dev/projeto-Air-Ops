// Edge Function: agenda, reagenda, cancela, inicia, pausa, retoma e conclui OS
// (seção 11, "operações sensíveis no servidor").
// Fina de propósito (regra 10 da seção 7): lê o pedido, busca os dados, pergunta às regras
// (regras.ts) e grava. Usa a chave de serviço, então SEMPRE confere empresa e papel antes.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import {
  decidir,
  decidirConclusao,
  lerPedido,
  STATUS_HTTP,
  type OrdemAtual,
  type Pedido,
  type Vinculo,
} from './regras.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function erro(status: number, codigo: string, mensagem: string, campo?: string): Response {
  return responder(status, { codigo, mensagem, campo });
}

async function buscarVinculo(
  banco: SupabaseClient,
  organizacaoId: string,
  usuarioId: string,
): Promise<Vinculo> {
  const { data } = await banco
    .from('organizacao_usuarios')
    .select('papeis, ativo, usuario:usuarios!inner(nome, email)')
    .eq('organizacao_id', organizacaoId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (!data) return null;
  const usuario = data.usuario as unknown as { nome: string; email: string };
  return {
    papeis: data.papeis as string[],
    ativo: data.ativo as boolean,
    nome: usuario.nome.trim() || usuario.email,
  };
}

/** Conclusão (etapa 5): busca o que as regras precisam conferir e grava tudo de uma vez. */
async function concluir(
  banco: SupabaseClient,
  pedido: Extract<Pedido, { acao: 'concluir' }>,
  usuarioId: string,
  ordem: (OrdemAtual & { organizacaoId: string }) | null,
  quemPede: Vinculo,
): Promise<Response> {
  const [execucao, fotos, assinaturaEnviada] = ordem
    ? await Promise.all([
        banco
          .from('ordem_servico_execucao')
          .select('diagnostico')
          .eq('ordem_id', pedido.ordemId)
          .maybeSingle(),
        banco
          .from('anexos')
          .select('id', { count: 'exact', head: true })
          .eq('ordem_id', pedido.ordemId),
        'caminho' in pedido.assinatura
          ? banco.storage.from('anexos').exists(pedido.assinatura.caminho)
          : Promise.resolve({ data: false }),
      ])
    : [null, null, null];

  const decisao = decidirConclusao({
    pedido,
    usuarioId,
    ordem,
    quemPede,
    diagnostico: execucao?.data?.diagnostico ?? null,
    fotosEnviadas: fotos?.count ?? 0,
    assinaturaEnviada: assinaturaEnviada?.data === true,
  });
  if (!decisao.ok) {
    return erro(STATUS_HTTP[decisao.codigo], decisao.codigo, decisao.mensagem, decisao.campo);
  }

  const { error: erroGravacao } = await banco.rpc('registrar_conclusao', decisao.gravacao);
  if (erroGravacao) {
    if (erroGravacao.code === '55000') return erro(409, 'transicao_invalida', erroGravacao.message);
    return erro(500, 'desconhecido', 'Não foi possível concluir. Tente de novo em instantes.');
  }
  return responder(200, { ok: true });
}

Deno.serve(async (requisicao) => {
  if (requisicao.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (requisicao.method !== 'POST') return erro(405, 'dados_invalidos', 'Use POST.');

  const banco = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Quem está pedindo: confere o token do login, em vez de confiar no que o navegador diz.
  const token = requisicao.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: autenticacao } = await banco.auth.getUser(token);
  const usuario = autenticacao?.user;
  if (!usuario) return erro(401, 'sem_permissao', 'Entre de novo no sistema.');

  const leitura = lerPedido(await requisicao.json().catch(() => null));
  if (!leitura.ok) return erro(400, leitura.codigo, leitura.mensagem, leitura.campo);
  const { pedido } = leitura;

  const { data: linha, error: erroOrdem } = await banco
    .from('ordens_servico')
    .select('organizacao_id, status, tecnico_id, agendada_para, duracao_minutos')
    .eq('id', pedido.ordemId)
    .maybeSingle();
  if (erroOrdem) return erro(500, 'desconhecido', 'Não foi possível ler a OS.');

  const ordem: OrdemAtual | null = linha
    ? {
        status: linha.status,
        tecnicoId: linha.tecnico_id,
        agendadaPara: linha.agendada_para,
        duracaoMinutos: linha.duracao_minutos,
      }
    : null;
  const quemPede = linha ? await buscarVinculo(banco, linha.organizacao_id, usuario.id) : null;

  if (pedido.acao === 'concluir') {
    return concluir(
      banco,
      pedido,
      usuario.id,
      linha && ordem ? { ...ordem, organizacaoId: linha.organizacao_id } : null,
      quemPede,
    );
  }

  const tecnico =
    linha && pedido.acao === 'agendar'
      ? await buscarVinculo(banco, linha.organizacao_id, pedido.tecnicoId)
      : null;

  const decisao = decidir({ pedido, usuarioId: usuario.id, ordem, quemPede, tecnico });
  if (!decisao.ok) {
    return erro(STATUS_HTTP[decisao.codigo], decisao.codigo, decisao.mensagem, decisao.campo);
  }

  const { error: erroGravacao } = await banco.rpc('registrar_mudanca_status', decisao.gravacao);
  if (erroGravacao) {
    // 55000: o status mudou entre a leitura e a gravação (outra pessoa mexeu ao mesmo tempo).
    if (erroGravacao.code === '55000') {
      return erro(409, 'transicao_invalida', erroGravacao.message);
    }
    return erro(500, 'desconhecido', 'Não foi possível salvar. Tente de novo em instantes.');
  }

  return responder(200, { ok: true });
});
