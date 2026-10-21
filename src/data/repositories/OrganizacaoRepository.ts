import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';

export interface OrganizacaoRepository {
  /** Empresas em que o usuário logado tem vínculo ativo. */
  listarDoUsuario(): Promise<OrganizacaoDoUsuario[]>;
}
