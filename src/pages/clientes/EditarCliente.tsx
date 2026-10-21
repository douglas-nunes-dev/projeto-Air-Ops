import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { clienteParaFormulario, type ClienteFormulario } from '@/domain/cliente/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { atualizarCliente, buscarCliente } from '@/services/clienteService';
import { NaoEncontrado } from '../NaoEncontrado';
import { FormularioCliente } from './FormularioCliente';

export function EditarCliente() {
  const { id = '' } = useParams();
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();
  const consulta = useQuery({ queryKey: chaves.cliente(id), queryFn: () => buscarCliente(id) });

  async function salvar(dados: ClienteFormulario) {
    await atualizarCliente(id, dados);
    await Promise.all([
      cache.invalidateQueries({ queryKey: chaves.cliente(id) }),
      cache.invalidateQueries({ queryKey: chaves.clientes(organizacao.id) }),
      cache.invalidateQueries({ queryKey: chaves.equipamentos(organizacao.id) }),
    ]);
    toast.success('Cliente atualizado.');
    navegar(`/clientes/${id}`, { replace: true });
  }

  if (consulta.isPending) return <CarregandoLista linhas={6} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  if (!consulta.data) return <NaoEncontrado oQue="Cliente" voltarPara="/clientes" />;

  return (
    <>
      <CabecalhoPagina
        titulo="Editar cliente"
        descricao={consulta.data.nome}
        voltar={{ para: `/clientes/${id}`, rotulo: consulta.data.nome }}
      />
      <FormularioCliente
        valoresIniciais={clienteParaFormulario(consulta.data)}
        rotuloSalvar="Salvar alterações"
        aoSalvar={salvar}
        aoCancelar={() => navegar(`/clientes/${id}`)}
      />
    </>
  );
}
