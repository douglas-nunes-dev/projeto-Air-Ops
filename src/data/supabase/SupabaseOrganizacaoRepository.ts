import type { OrganizacaoRepository } from '../repositories/OrganizacaoRepository';
import { ErroDados } from '@/domain/erros';
import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';
import { obterClienteSupabase } from './client';
import { exigirDados } from './erros';
import { ordenarPapeis } from './mapeadores';

export class SupabaseOrganizacaoRepository implements OrganizacaoRepository {
  async listarDoUsuario(): Promise<OrganizacaoDoUsuario[]> {
    const supabase = obterClienteSupabase();
    const { data: sessao } = await supabase.auth.getSession();
    const usuarioId = sessao.session?.user.id;
    if (!usuarioId) throw new ErroDados('sem_permissao');

    // Filtra pelo próprio usuário: admin e gestor também enxergam os vínculos dos colegas.
    const linhas = exigirDados(
      await supabase
        .from('organizacao_usuarios')
        .select('papeis, organizacao:organizacoes!inner(id, nome)')
        .eq('usuario_id', usuarioId)
        .eq('ativo', true)
        .order('criado_em'),
    );

    return linhas.map((linha) => ({
      id: linha.organizacao.id,
      nome: linha.organizacao.nome,
      papeis: ordenarPapeis(linha.papeis),
    }));
  }
}
