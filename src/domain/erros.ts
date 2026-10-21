export type MotivoErroDados =
  | 'duplicado'
  | 'sem_permissao'
  | 'nao_encontrado'
  | 'dados_invalidos'
  | 'sem_conexao'
  | 'desconhecido';

const MENSAGENS_PADRAO: Record<MotivoErroDados, string> = {
  duplicado: 'Já existe um cadastro com esses dados.',
  sem_permissao: 'Você não tem permissão para fazer isso.',
  nao_encontrado: 'Cadastro não encontrado.',
  dados_invalidos: 'Alguns dados são inválidos. Confira o formulário.',
  sem_conexao: 'Sem conexão com o servidor. Confira a internet e tente de novo.',
  desconhecido: 'Não foi possível salvar. Tente de novo em instantes.',
};

// Erro do domínio para leitura e gravação de dados: as telas tratam só este tipo,
// sem saber qual banco ou API está por trás.
export class ErroDados extends Error {
  readonly motivo: MotivoErroDados;
  /** Campo do formulário relacionado ao erro, quando dá para saber (ex.: "documento"). */
  readonly campo: string | null;

  constructor(
    motivo: MotivoErroDados,
    opcoes: { mensagem?: string; campo?: string; cause?: unknown } = {},
  ) {
    super(opcoes.mensagem ?? MENSAGENS_PADRAO[motivo], { cause: opcoes.cause });
    this.name = 'ErroDados';
    this.motivo = motivo;
    this.campo = opcoes.campo ?? null;
  }
}
