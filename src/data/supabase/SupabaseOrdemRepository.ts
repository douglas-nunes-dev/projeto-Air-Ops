import type { OrdemRepository } from '../repositories/OrdemRepository';
import type { DadosAgendamento } from '@/domain/ordem/planejamento';
import type { DadosOrdem, EventoOrdem, Ordem } from '@/domain/ordem/tipos';
import { obterClienteSupabase } from './client';
import { chamarFuncao, dadosOuNulo, exigirDados, exigirSucesso } from './erros';
import { argumentosOrdem, COLUNAS_ORDEM, mapearEvento, mapearOrdem } from './mapeadores';

export class SupabaseOrdemRepository implements OrdemRepository {
  async listar(organizacaoId: string): Promise<Ordem[]> {
    const linhas = exigirDados(
      await obterClienteSupabase()
        .from('ordens_servico')
        .select(COLUNAS_ORDEM)
        .eq('organizacao_id', organizacaoId)
        .order('numero', { ascending: false }),
    );
    return linhas.map(mapearOrdem);
  }

  async buscarPorId(id: string): Promise<Ordem | null> {
    const linha = dadosOuNulo(
      await obterClienteSupabase()
        .from('ordens_servico')
        .select(COLUNAS_ORDEM)
        .eq('id', id)
        .maybeSingle(),
    );
    return linha ? mapearOrdem(linha) : null;
  }

  async abrir(organizacaoId: string, dados: DadosOrdem): Promise<Ordem> {
    const id = exigirDados(
      await obterClienteSupabase().rpc('abrir_ordem_servico', {
        p_organizacao_id: organizacaoId,
        ...argumentosOrdem(dados),
      }),
    );
    return this.exigirOrdem(id);
  }

  async editar(id: string, dados: DadosOrdem): Promise<Ordem> {
    exigirSucesso(
      await obterClienteSupabase().rpc('editar_ordem_servico', {
        p_id: id,
        ...argumentosOrdem(dados),
      }),
    );
    return this.exigirOrdem(id);
  }

  async listarEventos(ordemId: string): Promise<EventoOrdem[]> {
    const linhas = exigirDados(
      await obterClienteSupabase()
        .from('ordem_servico_eventos')
        .select('*, usuario:usuarios(nome, email)')
        .eq('ordem_id', ordemId)
        .order('criado_em'),
    );
    return linhas.map(mapearEvento);
  }

  async agendar(id: string, dados: DadosAgendamento): Promise<void> {
    await chamarFuncao('alterar-status-ordem', { acao: 'agendar', ordemId: id, ...dados });
  }

  async cancelar(id: string, motivo: string): Promise<void> {
    await chamarFuncao('alterar-status-ordem', { acao: 'cancelar', ordemId: id, motivo });
  }

  async iniciar(id: string): Promise<void> {
    await chamarFuncao('alterar-status-ordem', { acao: 'iniciar', ordemId: id });
  }

  async pausar(id: string, motivo: string): Promise<void> {
    await chamarFuncao('alterar-status-ordem', { acao: 'pausar', ordemId: id, motivo });
  }

  private async exigirOrdem(id: string): Promise<Ordem> {
    const linha = exigirDados(
      await obterClienteSupabase()
        .from('ordens_servico')
        .select(COLUNAS_ORDEM)
        .eq('id', id)
        .single(),
    );
    return mapearOrdem(linha);
  }
}
