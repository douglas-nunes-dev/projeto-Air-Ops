import { clienteRepository, localRepository } from '@/data';
import {
  LocalFormularioSchema,
  type LocalAtendimento,
  type LocalFormulario,
} from '@/domain/cliente/local';
import {
  ClienteFormularioSchema,
  type Cliente,
  type ClienteFormulario,
} from '@/domain/cliente/tipos';

// Clientes

export async function listarClientes(organizacaoId: string): Promise<Cliente[]> {
  return clienteRepository.listar(organizacaoId);
}

export async function buscarCliente(id: string): Promise<Cliente | null> {
  return clienteRepository.buscarPorId(id);
}

export async function criarCliente(
  organizacaoId: string,
  formulario: ClienteFormulario,
): Promise<Cliente> {
  return clienteRepository.criar(organizacaoId, ClienteFormularioSchema.parse(formulario));
}

export async function atualizarCliente(
  id: string,
  formulario: ClienteFormulario,
): Promise<Cliente> {
  return clienteRepository.atualizar(id, ClienteFormularioSchema.parse(formulario));
}

/** Arquivar esconde o cliente das listas sem apagar o histórico de atendimentos. */
export async function arquivarCliente(id: string): Promise<void> {
  await clienteRepository.definirAtivo(id, false);
}

export async function reativarCliente(id: string): Promise<void> {
  await clienteRepository.definirAtivo(id, true);
}

// Locais de atendimento (endereços, unidades e setores do cliente)

export async function listarLocaisDoCliente(clienteId: string): Promise<LocalAtendimento[]> {
  return localRepository.listarPorCliente(clienteId);
}

export async function listarLocais(organizacaoId: string): Promise<LocalAtendimento[]> {
  return localRepository.listar(organizacaoId);
}

export async function criarLocal(
  organizacaoId: string,
  clienteId: string,
  formulario: LocalFormulario,
): Promise<LocalAtendimento> {
  return localRepository.criar(organizacaoId, clienteId, LocalFormularioSchema.parse(formulario));
}

export async function atualizarLocal(
  id: string,
  formulario: LocalFormulario,
): Promise<LocalAtendimento> {
  return localRepository.atualizar(id, LocalFormularioSchema.parse(formulario));
}

export async function arquivarLocal(id: string): Promise<void> {
  await localRepository.definirAtivo(id, false);
}

export async function reativarLocal(id: string): Promise<void> {
  await localRepository.definirAtivo(id, true);
}
