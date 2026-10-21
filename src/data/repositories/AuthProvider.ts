import type { UsuarioLogado } from '@/domain/auth/tipos';

export type EventoSessao = 'entrou' | 'saiu' | 'recuperacao_senha' | 'atualizou';

export type OuvinteSessao = (evento: EventoSessao, usuario: UsuarioLogado | null) => void;

// Contrato de autenticação. Hoje é implementado com Supabase Auth; no futuro, com a API Node.
// Toda falha deve ser lançada como ErroAutenticacao.
export interface AuthProvider {
  entrar(email: string, senha: string): Promise<UsuarioLogado>;
  sair(): Promise<void>;
  usuarioAtual(): Promise<UsuarioLogado | null>;
  enviarRecuperacaoSenha(email: string, urlRetorno: string): Promise<void>;
  redefinirSenha(novaSenha: string): Promise<void>;
  /** Avisa quando a sessão muda. Retorna a função que cancela o aviso. */
  observarSessao(ouvinte: OuvinteSessao): () => void;
}
