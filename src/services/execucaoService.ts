import { execucaoRepository } from '@/data';
import {
  AnotacoesFormularioSchema,
  AtividadeFormularioSchema,
  ObservacaoChecklistSchema,
  type AnotacoesFormulario,
  type AtividadeFormulario,
  type Execucao,
  type RespostaChecklist,
} from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';

// Registro da execução (etapa 4). Quem pode gravar é conferido pelo RLS no banco.

export async function buscarExecucao(ordemId: string): Promise<Execucao> {
  return execucaoRepository.buscar(ordemId);
}

export async function prepararChecklist(ordemId: string): Promise<void> {
  await execucaoRepository.prepararChecklist(ordemId);
}

export async function responderItemChecklist(
  ordemId: string,
  posicao: number,
  resposta: RespostaChecklist | null,
  observacao: string,
): Promise<void> {
  await execucaoRepository.responderItem(
    ordemId,
    posicao,
    resposta,
    ObservacaoChecklistSchema.parse(observacao),
  );
}

export async function salvarAnotacoes(
  ordem: Pick<Ordem, 'id' | 'organizacaoId'>,
  formulario: AnotacoesFormulario,
): Promise<void> {
  await execucaoRepository.salvarAnotacoes(
    ordem.id,
    ordem.organizacaoId,
    AnotacoesFormularioSchema.parse(formulario),
  );
}

export async function adicionarAtividade(
  ordem: Pick<Ordem, 'id' | 'organizacaoId'>,
  formulario: AtividadeFormulario,
): Promise<void> {
  const { descricao } = AtividadeFormularioSchema.parse(formulario);
  await execucaoRepository.adicionarAtividade(ordem.id, ordem.organizacaoId, descricao);
}

export async function removerAtividade(id: string): Promise<void> {
  await execucaoRepository.removerAtividade(id);
}
