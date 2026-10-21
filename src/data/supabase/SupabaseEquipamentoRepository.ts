import type {
  EquipamentoRepository,
  FiltroEquipamentos,
} from '../repositories/EquipamentoRepository';
import type { DadosEquipamento, Equipamento } from '@/domain/equipamento/tipos';
import { obterClienteSupabase } from './client';
import { dadosOuNulo, exigirDados, exigirSucesso } from './erros';
import { COLUNAS_EQUIPAMENTO, linhaEquipamento, mapearEquipamento } from './mapeadores';

export class SupabaseEquipamentoRepository implements EquipamentoRepository {
  async listar(organizacaoId: string, filtro: FiltroEquipamentos = {}): Promise<Equipamento[]> {
    let consulta = obterClienteSupabase()
      .from('equipamentos')
      .select(COLUNAS_EQUIPAMENTO)
      .eq('organizacao_id', organizacaoId)
      .order('identificacao');
    if (filtro.localId) consulta = consulta.eq('local_id', filtro.localId);
    if (filtro.clienteId) consulta = consulta.eq('local.cliente_id', filtro.clienteId);

    const linhas = exigirDados(await consulta);
    return linhas.map(mapearEquipamento);
  }

  async buscarPorId(id: string): Promise<Equipamento | null> {
    const linha = dadosOuNulo(
      await obterClienteSupabase()
        .from('equipamentos')
        .select(COLUNAS_EQUIPAMENTO)
        .eq('id', id)
        .maybeSingle(),
    );
    return linha ? mapearEquipamento(linha) : null;
  }

  async criar(organizacaoId: string, dados: DadosEquipamento): Promise<Equipamento> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('equipamentos')
        .insert({ organizacao_id: organizacaoId, ...linhaEquipamento(dados) })
        .select(COLUNAS_EQUIPAMENTO)
        .single(),
    );
    return mapearEquipamento(linha);
  }

  async atualizar(id: string, dados: DadosEquipamento): Promise<Equipamento> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('equipamentos')
        .update(linhaEquipamento(dados))
        .eq('id', id)
        .select(COLUNAS_EQUIPAMENTO)
        .single(),
    );
    return mapearEquipamento(linha);
  }

  async definirAtivo(id: string, ativo: boolean): Promise<void> {
    exigirSucesso(await obterClienteSupabase().from('equipamentos').update({ ativo }).eq('id', id));
  }
}
