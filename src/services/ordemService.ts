import { ordemRepository } from '@/data';
import { ErroDados } from '@/domain/erros';
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
