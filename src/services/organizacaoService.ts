import { organizacaoRepository } from '@/data';
import type { MembroOrganizacao, OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';

export async function listarMinhasOrganizacoes(): Promise<OrganizacaoDoUsuario[]> {
  return organizacaoRepository.listarDoUsuario();
}

export async function listarMembros(organizacaoId: string): Promise<MembroOrganizacao[]> {
  return organizacaoRepository.listarMembros(organizacaoId);
}
