import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import {
  formatarNumeroOrdem,
  ORDEM_FORMULARIO_VAZIO,
  type OrdemFormulario,
} from '@/domain/ordem/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { abrirOrdem } from '@/services/ordemService';
import { SemPermissaoOrdem } from './SemPermissaoOrdem';
import { FormularioOrdem } from './FormularioOrdem';

/** De onde a pessoa veio, para o "voltar" e o "cancelar". */
function origem(clienteId: string, equipamentoId: string) {
  if (equipamentoId) return { para: `/equipamentos/${equipamentoId}`, rotulo: 'Equipamento' };
  if (clienteId) return { para: `/clientes/${clienteId}`, rotulo: 'Cliente' };
  return { para: '/ordens', rotulo: 'Ordens de serviço' };
}

export function NovaOrdem() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();
  // Vinda da tela do cliente ou do equipamento, a OS já chega com eles escolhidos.
  const [parametros] = useSearchParams();
  const clienteId = parametros.get('clienteId') ?? '';
  const equipamentoId = parametros.get('equipamentoId') ?? '';
  const voltar = origem(clienteId, equipamentoId);

  async function salvar(dados: OrdemFormulario) {
    const ordem = await abrirOrdem(organizacao.id, dados);
    await cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) });
    toast.success(`${formatarNumeroOrdem(ordem.numero)} aberta.`);
    navegar(`/ordens/${ordem.id}`, { replace: true });
  }

  if (!organizacao.podeAbrirOrdens) return <SemPermissaoOrdem acao="abrir" />;

  return (
    <>
      <CabecalhoPagina
        titulo="Nova ordem de serviço"
        descricao="A OS nasce com o status Aberta. Data e técnico são definidos no planejamento."
        voltar={voltar}
      />
      <FormularioOrdem
        valoresIniciais={ORDEM_FORMULARIO_VAZIO}
        preenchimento={{ clienteId, equipamentoId }}
        rotuloSalvar="Abrir OS"
        aoSalvar={salvar}
        aoCancelar={() => navegar(voltar.para)}
      />
    </>
  );
}
