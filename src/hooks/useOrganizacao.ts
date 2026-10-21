import { createContext, useContext } from 'react';
import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';

export type EstadoOrganizacao = OrganizacaoDoUsuario & {
  /** Admin e gestor cadastram e alteram; técnico só consulta (seção 11). */
  podeEditarCadastros: boolean;
};

export const ContextoOrganizacao = createContext<EstadoOrganizacao | null>(null);

export function useOrganizacao(): EstadoOrganizacao {
  const organizacao = useContext(ContextoOrganizacao);
  if (!organizacao) throw new Error('useOrganizacao precisa estar dentro de <OrganizacaoProvider>');
  return organizacao;
}
