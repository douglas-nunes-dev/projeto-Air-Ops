import type { LocalAtendimento } from '@/domain/cliente/local';
import type { Equipamento } from '@/domain/equipamento/tipos';
import type { OrdemFormulario } from './tipos';

/** O que já vem escolhido quando a OS é aberta a partir de outra tela. */
export type Preenchimento = {
  clienteId?: string;
  equipamentoId?: string;
};

export function locaisAtivosDoCliente(
  locais: LocalAtendimento[],
  clienteId: string,
): LocalAtendimento[] {
  return locais.filter((local) => local.clienteId === clienteId && local.ativo);
}

/**
 * Valores iniciais a partir do que veio de outra tela. Vindo de um equipamento,
 * cliente, local e equipamento já chegam escolhidos; vindo de um cliente com
 * um local só, o local também.
 */
export function valoresComPreenchimento(
  valores: OrdemFormulario,
  preenchimento: Preenchimento,
  cadastros: { locais: LocalAtendimento[]; equipamentos: Equipamento[] },
): OrdemFormulario {
  const equipamento = cadastros.equipamentos.find(
    (item) => item.id === preenchimento.equipamentoId,
  );
  if (equipamento) {
    return {
      ...valores,
      clienteId: equipamento.clienteId,
      localId: equipamento.localId,
      equipamentoIds: [equipamento.id],
    };
  }
  if (!preenchimento.clienteId) return valores;

  const locaisDoCliente = locaisAtivosDoCliente(cadastros.locais, preenchimento.clienteId);
  return {
    ...valores,
    clienteId: preenchimento.clienteId,
    localId: locaisDoCliente.length === 1 ? locaisDoCliente[0].id : '',
  };
}
