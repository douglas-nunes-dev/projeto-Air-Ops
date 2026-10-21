import type { MembroOrganizacao, OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';

export interface OrganizacaoRepository {
  /** Empresas em que o usuário logado tem vínculo ativo. */
  listarDoUsuario(): Promise<OrganizacaoDoUsuario[]>;
  /** Pessoas da empresa. Admin e gestor veem todas; os demais, só o próprio vínculo (RLS). */
  listarMembros(organizacaoId: string): Promise<MembroOrganizacao[]>;
}
