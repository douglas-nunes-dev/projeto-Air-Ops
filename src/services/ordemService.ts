import { ordemRepository } from '@/data';
import { ErroDados } from '@/domain/erros';
import {
  AgendamentoFormularioSchema,
  CancelamentoFormularioSchema,
  podeAgendar,
  podeCancelar,
  type AgendamentoFormulario,
  type CancelamentoFormulario,
} from '@/domain/ordem/planejamento';
import {
  OrdemFormularioSchema,
  type EventoOrdem,
  type Ordem,
  type OrdemFormulario,
} from '@/domain/ordem/tipos';
import { podeEditarAbertura } from '@/domain/ordem/transicoes';

export async function listarOrdens(organizacaoId: string): Promise<Ordem[]> {
  return ordemRepository.listar(organizacaoId);
}

export async function buscarOrdem(id: string): Promise<Ordem | null> {
  return ordemRepository.buscarPorId(id);
}

export async function abrirOrdem(
  organizacaoId: string,
  formulario: OrdemFormulario,
): Promise<Ordem> {
  return ordemRepository.abrir(organizacaoId, OrdemFormularioSchema.parse(formulario));
}

export async function editarOrdem(ordem: Ordem, formulario: OrdemFormulario): Promise<Ordem> {
  // Retorno rápido na tela; quem garante de verdade é o RLS (seção 11).
  if (!podeEditarAbertura(ordem.status)) {
    throw new ErroDados('sem_permissao', {
      mensagem: 'Esta OS já foi encerrada e não pode mais ser editada.',
    });
  }
  return ordemRepository.editar(ordem.id, OrdemFormularioSchema.parse(formulario));
}

export async function listarEventosDaOrdem(ordemId: string): Promise<EventoOrdem[]> {
  return ordemRepository.listarEventos(ordemId);
}

// Planejamento (etapa 3). As checagens daqui dão retorno rápido na tela;
// quem garante de verdade é a Edge Function "alterar-status-ordem".

export async function agendarOrdem(ordem: Ordem, formulario: AgendamentoFormulario): Promise<void> {
  if (!podeAgendar(ordem)) {
    throw new ErroDados('dados_invalidos', {
      mensagem:
        ordem.status === 'em_execucao'
          ? 'A OS está em execução. Pause antes de reagendar.'
          : 'Esta OS já foi encerrada e não pode ser agendada.',
    });
  }
  await ordemRepository.agendar(ordem.id, AgendamentoFormularioSchema.parse(formulario));
}

export async function cancelarOrdem(
  ordem: Ordem,
  formulario: CancelamentoFormulario,
): Promise<void> {
  if (!podeCancelar(ordem)) {
    throw new ErroDados('dados_invalidos', {
      mensagem: 'Esta OS já foi encerrada e não pode ser cancelada.',
    });
  }
  await ordemRepository.cancelar(ordem.id, CancelamentoFormularioSchema.parse(formulario).motivo);
}
