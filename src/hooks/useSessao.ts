import { createContext, useContext } from 'react';
import type { UsuarioLogado } from '@/domain/auth/tipos';

export type EstadoSessao = {
  usuario: UsuarioLogado | null;
  carregando: boolean;
};

export const ContextoSessao = createContext<EstadoSessao | null>(null);

export function useSessao(): EstadoSessao {
  const sessao = useContext(ContextoSessao);
  if (!sessao) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return sessao;
}
