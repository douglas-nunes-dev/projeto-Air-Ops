import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import {
  formatarNumeroOrdem,
  ordemParaFormulario,
  type Ordem,
  type OrdemFormulario,
} from '@/domain/ordem/tipos';
import { podeEditarAbertura } from '@/domain/ordem/transicoes';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { buscarOrdem, editarOrdem } from '@/services/ordemService';
import { NaoEncontrado } from '../NaoEncontrado';
import { FormularioOrdem } from './FormularioOrdem';
import { SemPermissaoOrdem } from './SemPermissaoOrdem';

export function EditarOrdem() {
  const { id = '' } = useParams();
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();
  const consulta = useQuery({ queryKey: chaves.ordem(id), queryFn: () => buscarOrdem(id) });
  const detalhe = `/ordens/${id}`;

  async function salvar(ordem: Ordem, dados: OrdemFormulario) {
    await editarOrdem(ordem, dados);
    await Promise.all([
      cache.invalidateQueries({ queryKey: chaves.ordem(id) }),
      cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) }),
    ]);
    toast.success(`${formatarNumeroOrdem(ordem.numero)} atualizada.`);
    navegar(detalhe, { replace: true });
  }

  if (consulta.isPending) return <CarregandoLista linhas={6} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  const ordem = consulta.data;
  if (!ordem) return <NaoEncontrado oQue="Ordem de serviço" voltarPara="/ordens" feminino />;
  if (!organizacao.podeAbrirOrdens) {
    return <SemPermissaoOrdem acao="editar" voltarPara={detalhe} />;
  }
  if (!podeEditarAbertura(ordem.status)) {
    return (
      <SemPermissaoOrdem
        acao="editar"
        motivo="Ela já foi encerrada. OS concluída ou cancelada vira registro e não muda mais."
        voltarPara={detalhe}
      />
    );
  }

  const numero = formatarNumeroOrdem(ordem.numero);
  return (
    <>
      <CabecalhoPagina
        titulo={`Editar ${numero}`}
        descricao={ordem.clienteNome}
        voltar={{ para: detalhe, rotulo: numero }}
      />
      <FormularioOrdem
        valoresIniciais={ordemParaFormulario(ordem)}
        rotuloSalvar="Salvar alterações"
        aoSalvar={(dados) => salvar(ordem, dados)}
        aoCancelar={() => navegar(detalhe)}
      />
    </>
  );
}
