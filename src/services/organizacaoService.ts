import { organizacaoRepository } from '@/data';
import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';

export async function listarMinhasOrganizacoes(): Promise<OrganizacaoDoUsuario[]> {
  return organizacaoRepository.listarDoUsuario();
}
