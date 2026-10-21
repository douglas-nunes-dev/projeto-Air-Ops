import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CLIENTE_FORMULARIO_VAZIO, type ClienteFormulario } from '@/domain/cliente/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { criarCliente } from '@/services/clienteService';
import { FormularioCliente } from './FormularioCliente';

export function NovoCliente() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();

  async function salvar(dados: ClienteFormulario) {
    const cliente = await criarCliente(organizacao.id, dados);
    await cache.invalidateQueries({ queryKey: chaves.clientes(organizacao.id) });
    toast.success('Cliente cadastrado. Agora adicione os locais de atendimento.');
    // Vai para o detalhe, onde se cadastram os locais (endereços e setores).
    navegar(`/clientes/${cliente.id}`, { replace: true });
  }

  return (
    <>
      <CabecalhoPagina titulo="Novo cliente" voltar={{ para: '/clientes', rotulo: 'Clientes' }} />
      <FormularioCliente
        valoresIniciais={CLIENTE_FORMULARIO_VAZIO}
        rotuloSalvar="Cadastrar cliente"
        aoSalvar={salvar}
        aoCancelar={() => navegar('/clientes')}
      />
    </>
  );
}
