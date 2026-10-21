import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { equipamentoParaFormulario, type EquipamentoFormulario } from '@/domain/equipamento/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { atualizarEquipamento, buscarEquipamento } from '@/services/equipamentoService';
import { NaoEncontrado } from '../NaoEncontrado';
import { FormularioEquipamento } from './FormularioEquipamento';

export function EditarEquipamento() {
  const { id = '' } = useParams();
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();
  const consulta = useQuery({
    queryKey: chaves.equipamento(id),
    queryFn: () => buscarEquipamento(id),
  });

  async function salvar(dados: EquipamentoFormulario) {
    await atualizarEquipamento(id, dados);
    await Promise.all([
      cache.invalidateQueries({ queryKey: chaves.equipamento(id) }),
      cache.invalidateQueries({ queryKey: chaves.equipamentos(organizacao.id) }),
    ]);
    toast.success('Equipamento atualizado.');
    navegar(`/equipamentos/${id}`, { replace: true });
  }

  if (consulta.isPending) return <CarregandoLista linhas={6} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  const equipamento = consulta.data;
  if (!equipamento) return <NaoEncontrado oQue="Equipamento" voltarPara="/equipamentos" />;

  return (
    <>
      <CabecalhoPagina
        titulo="Editar equipamento"
        descricao={equipamento.identificacao}
        voltar={{ para: `/equipamentos/${id}`, rotulo: equipamento.identificacao }}
      />
      <FormularioEquipamento
        valoresIniciais={equipamentoParaFormulario(equipamento)}
        clienteIdInicial={equipamento.clienteId}
        rotuloSalvar="Salvar alterações"
        aoSalvar={salvar}
        aoCancelar={() => navegar(`/equipamentos/${id}`)}
      />
    </>
  );
}
