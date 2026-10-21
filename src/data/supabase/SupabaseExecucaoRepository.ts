import type { ExecucaoRepository, NovaFoto } from '../repositories/ExecucaoRepository';
import { ErroDados } from '@/domain/erros';
import type {
  AnotacoesExecucao,
  Execucao,
  FotoDaOrdem,
  RespostaChecklist,
} from '@/domain/ordem/execucao';
import { obterClienteSupabase } from './client';
import { converterErroBanco, dadosOuNulo, exigirDados } from './erros';
import { mapearAtividade, mapearFoto, mapearItemChecklist } from './mapeadores';

// O RLS não dá erro quando bloqueia um update ou delete: só não altera nada.
// Por isso essas operações pedem as linhas de volta e conferem se alguma mudou.
const FORA_DA_EXECUCAO = new ErroDados('sem_permissao', {
  mensagem: 'Só o técnico da OS, com ela em execução, pode registrar isso.',
});

export class SupabaseExecucaoRepository implements ExecucaoRepository {
  async buscar(ordemId: string): Promise<Execucao> {
    const banco = obterClienteSupabase();
    const [anotacoes, checklist, atividades, fotos] = await Promise.all([
      banco
        .from('ordem_servico_execucao')
        .select('diagnostico, materiais')
        .eq('ordem_id', ordemId)
        .maybeSingle(),
      banco.from('checklist_respostas').select('*').eq('ordem_id', ordemId).order('posicao'),
      banco
        .from('ordem_servico_itens')
        .select('*, usuario:usuarios!ordem_servico_itens_criado_por_fkey(nome, email)')
        .eq('ordem_id', ordemId)
        .order('criado_em'),
      banco
        .from('anexos')
        .select('*, usuario:usuarios!anexos_criado_por_fkey(nome, email)')
        .eq('ordem_id', ordemId)
        .order('tirada_em'),
    ]);

    return {
      anotacoes: dadosOuNulo(anotacoes) ?? { diagnostico: null, materiais: null },
      checklist: exigirDados(checklist).map(mapearItemChecklist),
      atividades: exigirDados(atividades).map(mapearAtividade),
      fotos: exigirDados(fotos).map(mapearFoto),
    };
  }

  async prepararChecklist(ordemId: string): Promise<void> {
    const { error } = await obterClienteSupabase().rpc('preparar_checklist', {
      p_ordem_id: ordemId,
    });
    if (error) throw converterErroBanco(error);
  }

  async responderItem(
    ordemId: string,
    posicao: number,
    resposta: RespostaChecklist | null,
    observacao: string | null,
  ): Promise<void> {
    const alteradas = exigirDados(
      await obterClienteSupabase()
        .from('checklist_respostas')
        .update({ resposta, observacao })
        .eq('ordem_id', ordemId)
        .eq('posicao', posicao)
        .select('posicao'),
    );
    if (alteradas.length === 0) throw FORA_DA_EXECUCAO;
  }

  async salvarAnotacoes(ordemId: string, anotacoes: AnotacoesExecucao): Promise<void> {
    // Função do banco em vez de upsert: o upsert tentaria alterar também as colunas de chave,
    // que o app não tem permissão de alterar (migration 20261022130000).
    const { error } = await obterClienteSupabase().rpc('salvar_anotacoes_execucao', {
      p_ordem_id: ordemId,
      // O gerador de tipos não marca parâmetros de função como opcionais; a função aceita null.
      p_diagnostico: anotacoes.diagnostico as string,
      p_materiais: anotacoes.materiais as string,
    });
    if (error) throw converterErroBanco(error);
  }

  async adicionarAtividade(ordemId: string, organizacaoId: string, descricao: string) {
    exigirDados(
      await obterClienteSupabase()
        .from('ordem_servico_itens')
        .insert({ ordem_id: ordemId, organizacao_id: organizacaoId, descricao })
        .select('id'),
    );
  }

  async removerAtividade(id: string): Promise<void> {
    const apagadas = exigirDados(
      await obterClienteSupabase().from('ordem_servico_itens').delete().eq('id', id).select('id'),
    );
    if (apagadas.length === 0) throw FORA_DA_EXECUCAO;
  }

  async registrarFoto(foto: NovaFoto): Promise<void> {
    const { error } = await obterClienteSupabase()
      .from('anexos')
      .insert({
        id: foto.id,
        organizacao_id: foto.organizacaoId,
        ordem_id: foto.ordemId,
        caminho: `${foto.organizacaoId}/${foto.ordemId}/${foto.id}.jpg`,
        legenda: foto.legenda,
        tamanho_bytes: foto.tamanhoBytes,
        tirada_em: foto.tiradaEm,
      });
    // 23505: a mesma foto já foi registrada num envio anterior que perdeu o sinal no meio.
    if (error && error.code !== '23505') throw converterErroBanco(error);
  }

  async removerFoto(foto: Pick<FotoDaOrdem, 'id'>): Promise<void> {
    const apagadas = exigirDados(
      await obterClienteSupabase().from('anexos').delete().eq('id', foto.id).select('id'),
    );
    if (apagadas.length === 0) throw FORA_DA_EXECUCAO;
  }
}
