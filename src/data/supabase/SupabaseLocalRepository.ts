import type { LocalRepository } from '../repositories/LocalRepository';
import type { DadosLocal, LocalAtendimento } from '@/domain/cliente/local';
import { obterClienteSupabase } from './client';
import { exigirDados, exigirSucesso } from './erros';
import { linhaLocal, mapearLocal } from './mapeadores';

export class SupabaseLocalRepository implements LocalRepository {
  async listarPorCliente(clienteId: string): Promise<LocalAtendimento[]> {
    const linhas = exigirDados(
      await obterClienteSupabase()
        .from('locais_atendimento')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('nome'),
    );
    return linhas.map(mapearLocal);
  }

  async listar(organizacaoId: string): Promise<LocalAtendimento[]> {
    const linhas = exigirDados(
      await obterClienteSupabase()
        .from('locais_atendimento')
        .select('*')
        .eq('organizacao_id', organizacaoId)
        .order('nome'),
    );
    return linhas.map(mapearLocal);
  }

  async criar(
    organizacaoId: string,
    clienteId: string,
    dados: DadosLocal,
  ): Promise<LocalAtendimento> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('locais_atendimento')
        .insert({ organizacao_id: organizacaoId, cliente_id: clienteId, ...linhaLocal(dados) })
        .select('*')
        .single(),
    );
    return mapearLocal(linha);
  }

  async atualizar(id: string, dados: DadosLocal): Promise<LocalAtendimento> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('locais_atendimento')
        .update(linhaLocal(dados))
        .eq('id', id)
        .select('*')
        .single(),
    );
    return mapearLocal(linha);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<void> {
    exigirSucesso(
      await obterClienteSupabase().from('locais_atendimento').update({ ativo }).eq('id', id),
    );
  }
}
