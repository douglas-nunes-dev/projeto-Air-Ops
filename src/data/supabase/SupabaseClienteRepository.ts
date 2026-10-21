import type { ClienteRepository } from '../repositories/ClienteRepository';
import type { Cliente, DadosCliente } from '@/domain/cliente/tipos';
import { obterClienteSupabase } from './client';
import { dadosOuNulo, exigirDados, exigirSucesso } from './erros';
import { linhaCliente, mapearCliente } from './mapeadores';

export class SupabaseClienteRepository implements ClienteRepository {
  async listar(organizacaoId: string): Promise<Cliente[]> {
    const linhas = exigirDados(
      await obterClienteSupabase()
        .from('clientes')
        .select('*')
        .eq('organizacao_id', organizacaoId)
        .order('nome'),
    );
    return linhas.map(mapearCliente);
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const linha = dadosOuNulo(
      await obterClienteSupabase().from('clientes').select('*').eq('id', id).maybeSingle(),
    );
    return linha ? mapearCliente(linha) : null;
  }

  async criar(organizacaoId: string, dados: DadosCliente): Promise<Cliente> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('clientes')
        .insert({ organizacao_id: organizacaoId, ...linhaCliente(dados) })
        .select('*')
        .single(),
    );
    return mapearCliente(linha);
  }

  async atualizar(id: string, dados: DadosCliente): Promise<Cliente> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('clientes')
        .update(linhaCliente(dados))
        .eq('id', id)
        .select('*')
        .single(),
    );
    return mapearCliente(linha);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<void> {
    exigirSucesso(await obterClienteSupabase().from('clientes').update({ ativo }).eq('id', id));
  }
}
