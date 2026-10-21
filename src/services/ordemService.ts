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
import {
  PausaFormularioSchema,
  podeIniciar,
  podePausar,
  type PausaFormulario,
} from '@/domain/ordem/execucao';
import { podeEditarAbertura } from '@/domain/ordem/transicoes';
import type { Papel } from '@/domain/organizacao/tipos';

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

// Execução (etapa 4): só o técnico da OS. Garantido pela Edge Function "alterar-status-ordem".

type QuemUsa = { usuarioId: string; papeis: Papel[] };

/** Inicia uma OS agendada ou retoma uma pausada. */
export async function iniciarExecucao(ordem: Ordem, quem: QuemUsa): Promise<void> {
  if (!podeIniciar(ordem, quem)) {
    throw new ErroDados('dados_invalidos', {
      mensagem: 'Só o técnico da OS inicia a execução, com ela agendada ou pausada.',
    });
  }
  await ordemRepository.iniciar(ordem.id);
}

export async function pausarExecucao(
  ordem: Ordem,
  quem: QuemUsa,
  formulario: PausaFormulario,
): Promise<void> {
  if (!podePausar(ordem, quem)) {
    throw new ErroDados('dados_invalidos', {
      mensagem: 'Só o técnico da OS pausa a execução, com ela em andamento.',
    });
  }
  await ordemRepository.pausar(ordem.id, PausaFormularioSchema.parse(formulario));
}
