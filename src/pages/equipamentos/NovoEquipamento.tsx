import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import {
  EQUIPAMENTO_FORMULARIO_VAZIO,
  type EquipamentoFormulario,
} from '@/domain/equipamento/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { criarEquipamento } from '@/services/equipamentoService';
import { FormularioEquipamento } from './FormularioEquipamento';

export function NovoEquipamento() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();
  // Vindo da tela do cliente, o cliente já chega escolhido.
  const [parametros] = useSearchParams();
  const clienteId = parametros.get('clienteId') ?? '';
  const voltarPara = clienteId ? `/clientes/${clienteId}` : '/equipamentos';

  async function salvar(dados: EquipamentoFormulario) {
    const equipamento = await criarEquipamento(organizacao.id, dados);
    await cache.invalidateQueries({ queryKey: chaves.equipamentos(organizacao.id) });
    toast.success('Equipamento cadastrado.');
    navegar(`/equipamentos/${equipamento.id}`, { replace: true });
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Novo equipamento"
        voltar={{ para: voltarPara, rotulo: clienteId ? 'Cliente' : 'Equipamentos' }}
      />
      <FormularioEquipamento
        valoresIniciais={EQUIPAMENTO_FORMULARIO_VAZIO}
        clienteIdInicial={clienteId}
        rotuloSalvar="Cadastrar equipamento"
        aoSalvar={salvar}
        aoCancelar={() => navegar(voltarPara)}
      />
    </>
  );
}
