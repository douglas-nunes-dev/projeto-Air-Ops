import { isAuthError, type AuthChangeEvent, type User } from '@supabase/supabase-js';
import type { AuthProvider, EventoSessao, OuvinteSessao } from '../repositories/AuthProvider';
import { ErroAutenticacao, type MotivoErroAutenticacao } from '@/domain/auth/erros';
import type { UsuarioLogado } from '@/domain/auth/tipos';
import { obterClienteSupabase } from './client';

// Códigos de erro do Supabase Auth: https://supabase.com/docs/guides/auth/debugging/error-codes
const MOTIVOS_POR_CODIGO: Record<string, MotivoErroAutenticacao> = {
  invalid_credentials: 'credenciais_invalidas',
  email_not_confirmed: 'email_nao_confirmado',
  over_request_rate_limit: 'muitas_tentativas',
  over_email_send_rate_limit: 'muitas_tentativas',
  weak_password: 'senha_fraca',
  same_password: 'mesma_senha',
  session_not_found: 'sessao_expirada',
  session_expired: 'sessao_expirada',
};

const EVENTOS: Partial<Record<AuthChangeEvent, EventoSessao>> = {
  SIGNED_IN: 'entrou',
  SIGNED_OUT: 'saiu',
  PASSWORD_RECOVERY: 'recuperacao_senha',
  USER_UPDATED: 'atualizou',
};

function converterErro(erro: unknown): ErroAutenticacao {
  if (erro instanceof ErroAutenticacao) return erro;
  if (!isAuthError(erro)) return new ErroAutenticacao('desconhecido', { cause: erro });

  if (erro.name === 'AuthSessionMissingError') {
    return new ErroAutenticacao('sessao_expirada', { cause: erro });
  }
  const motivo = (erro.code && MOTIVOS_POR_CODIGO[erro.code]) ?? 'desconhecido';
  return new ErroAutenticacao(motivo, { cause: erro });
}

function mapearUsuario(usuario: User): UsuarioLogado {
  return { id: usuario.id, email: usuario.email ?? '' };
}

export class SupabaseAuthProvider implements AuthProvider {
  async entrar(email: string, senha: string): Promise<UsuarioLogado> {
    try {
      const { data, error } = await obterClienteSupabase().auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) throw error;
      return mapearUsuario(data.user);
    } catch (erro) {
      throw converterErro(erro);
    }
  }

  async sair(): Promise<void> {
    try {
      const { error } = await obterClienteSupabase().auth.signOut();
      if (error) throw error;
    } catch (erro) {
      throw converterErro(erro);
    }
  }

  async usuarioAtual(): Promise<UsuarioLogado | null> {
    try {
      const { data, error } = await obterClienteSupabase().auth.getSession();
      if (error) throw error;
      return data.session ? mapearUsuario(data.session.user) : null;
    } catch (erro) {
      throw converterErro(erro);
    }
  }

  async enviarRecuperacaoSenha(email: string, urlRetorno: string): Promise<void> {
    try {
      const { error } = await obterClienteSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: urlRetorno,
      });
      if (error) throw error;
    } catch (erro) {
      throw converterErro(erro);
    }
  }

  async redefinirSenha(novaSenha: string): Promise<void> {
    try {
      const { error } = await obterClienteSupabase().auth.updateUser({ password: novaSenha });
      if (error) throw error;
    } catch (erro) {
      throw converterErro(erro);
    }
  }

  observarSessao(ouvinte: OuvinteSessao): () => void {
    const { data } = obterClienteSupabase().auth.onAuthStateChange((eventoSupabase, sessao) => {
      const evento = EVENTOS[eventoSupabase];
      if (!evento) return;
      ouvinte(evento, sessao ? mapearUsuario(sessao.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }
}
