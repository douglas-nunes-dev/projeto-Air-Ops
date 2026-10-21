export type MotivoErroAutenticacao =
  | 'credenciais_invalidas'
  | 'email_nao_confirmado'
  | 'muitas_tentativas'
  | 'senha_fraca'
  | 'mesma_senha'
  | 'sessao_expirada'
  | 'configuracao_ausente'
  | 'desconhecido';

const MENSAGENS: Record<MotivoErroAutenticacao, string> = {
  credenciais_invalidas: 'E-mail ou senha incorretos.',
  email_nao_confirmado: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  muitas_tentativas: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  senha_fraca: 'Essa senha é muito fraca. Use uma senha mais longa e difícil de adivinhar.',
  mesma_senha: 'A nova senha precisa ser diferente da atual.',
  sessao_expirada: 'O link expirou ou já foi usado. Peça um novo link de recuperação.',
  configuracao_ausente: 'O sistema não está configurado. Confira o arquivo .env.local.',
  desconhecido: 'Não foi possível concluir. Tente de novo em instantes.',
};

// Erro do domínio: as telas tratam só este tipo, sem saber qual serviço de login está por trás.
export class ErroAutenticacao extends Error {
  readonly motivo: MotivoErroAutenticacao;

  constructor(motivo: MotivoErroAutenticacao, opcoes?: { cause?: unknown }) {
    super(MENSAGENS[motivo], opcoes);
    this.name = 'ErroAutenticacao';
    this.motivo = motivo;
  }
}
