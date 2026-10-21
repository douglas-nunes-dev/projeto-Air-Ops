import type {
  AnotacoesExecucao,
  Execucao,
  FotoDaOrdem,
  RespostaChecklist,
} from '@/domain/ordem/execucao';

export type NovaFoto = {
  id: string;
  organizacaoId: string;
  ordemId: string;
  legenda: string | null;
  tamanhoBytes: number;
  tiradaEm: string;
};

// Registro da execução da OS (etapa 4). Só o técnico da OS grava (RLS).
// Toda falha deve ser lançada como ErroDados.
export interface ExecucaoRepository {
  buscar(ordemId: string): Promise<Execucao>;
  /** Copia os itens do modelo do tipo de serviço. Não faz nada se já houver checklist. */
  prepararChecklist(ordemId: string): Promise<void>;
  responderItem(
    ordemId: string,
    posicao: number,
    resposta: RespostaChecklist | null,
    observacao: string | null,
  ): Promise<void>;
  /** Cria as anotações na primeira vez e atualiza nas seguintes. */
  salvarAnotacoes(ordemId: string, anotacoes: AnotacoesExecucao): Promise<void>;
  adicionarAtividade(ordemId: string, organizacaoId: string, descricao: string): Promise<void>;
  removerAtividade(id: string): Promise<void>;
  /** Registra a foto já enviada ao Storage. Repetir com o mesmo id não duplica. */
  registrarFoto(foto: NovaFoto): Promise<void>;
  removerFoto(foto: Pick<FotoDaOrdem, 'id'>): Promise<void>;
}
