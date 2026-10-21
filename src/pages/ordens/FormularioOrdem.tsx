import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { aplicarErroNoFormulario } from '@/components/formulario/aplicarErro';
import { CampoAreaTexto } from '@/components/formulario/CampoAreaTexto';
import { CampoSelecao } from '@/components/formulario/CampoSelecao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import type { LocalAtendimento } from '@/domain/cliente/local';
import type { Cliente } from '@/domain/cliente/tipos';
import { ROTULOS_TIPO_EQUIPAMENTO, type Equipamento } from '@/domain/equipamento/tipos';
import {
  OrdemFormularioSchema,
  PRIORIDADES,
  ROTULOS_PRIORIDADE,
  ROTULOS_TIPO_SERVICO,
  TIPOS_SERVICO,
  type DadosOrdem,
  type OrdemFormulario,
} from '@/domain/ordem/tipos';
import {
  locaisAtivosDoCliente,
  valoresComPreenchimento,
  type Preenchimento,
} from '@/domain/ordem/preenchimento';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { listarClientes, listarLocais } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';

const CAMPOS = [
  'clienteId',
  'localId',
  'tipoServico',
  'prioridade',
  'problema',
  'solicitante',
  'equipamentoIds',
];

const OPCOES_TIPO = TIPOS_SERVICO.map((tipo) => ({
  valor: tipo,
  rotulo: ROTULOS_TIPO_SERVICO[tipo],
}));

const OPCOES_PRIORIDADE = PRIORIDADES.map((prioridade) => ({
  valor: prioridade,
  rotulo: ROTULOS_PRIORIDADE[prioridade],
}));

type FormularioOrdemProps = {
  valoresIniciais: OrdemFormulario;
  preenchimento?: Preenchimento;
  rotuloSalvar: string;
  aoSalvar: (dados: OrdemFormulario) => Promise<void>;
  aoCancelar: () => void;
};

type Cadastros = {
  clientes: Cliente[];
  locais: LocalAtendimento[];
  equipamentos: Equipamento[];
};

// Busca os cadastros antes de montar o formulário, para os campos já abrirem preenchidos.
export function FormularioOrdem(props: FormularioOrdemProps) {
  const organizacao = useOrganizacao();
  const clientes = useQuery({
    queryKey: chaves.clientes(organizacao.id),
    queryFn: () => listarClientes(organizacao.id),
  });
  const locais = useQuery({
    queryKey: chaves.locais(organizacao.id),
    queryFn: () => listarLocais(organizacao.id),
  });
  const equipamentos = useQuery({
    queryKey: chaves.equipamentos(organizacao.id),
    queryFn: () => listarEquipamentos(organizacao.id),
  });

  for (const consulta of [clientes, locais, equipamentos]) {
    if (consulta.isError) {
      return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
    }
  }
  if (!clientes.data || !locais.data || !equipamentos.data) {
    return <CarregandoLista linhas={6} />;
  }

  return (
    <CamposOrdem
      {...props}
      clientes={clientes.data}
      locais={locais.data}
      equipamentos={equipamentos.data}
    />
  );
}

function CamposOrdem({
  valoresIniciais,
  preenchimento = {},
  rotuloSalvar,
  aoSalvar,
  aoCancelar,
  clientes,
  locais,
  equipamentos,
}: FormularioOrdemProps & Cadastros) {
  const formulario = useForm<OrdemFormulario, unknown, DadosOrdem>({
    resolver: zodResolver(OrdemFormularioSchema),
    defaultValues: valoresComPreenchimento(valoresIniciais, preenchimento, {
      locais,
      equipamentos,
    }),
  });
  const { isSubmitting, errors, isSubmitted } = formulario.formState;
  const clienteId = useWatch({ control: formulario.control, name: 'clienteId' });
  const localId = useWatch({ control: formulario.control, name: 'localId' });
  const inicial = formulario.formState.defaultValues;

  // Arquivados ficam de fora, menos o que já estava escolhido (ao editar uma OS antiga).
  const opcoesClientes = clientes
    .filter((cliente) => cliente.ativo || cliente.id === inicial?.clienteId)
    .map((cliente) => ({ valor: cliente.id, rotulo: cliente.nome }));
  const opcoesLocais = locais
    .filter((local) => local.clienteId === clienteId)
    .filter((local) => local.ativo || local.id === inicial?.localId)
    .map((local) => ({ valor: local.id, rotulo: local.nome }));
  const equipamentosDoLocal = equipamentos
    .filter((equipamento) => equipamento.localId === localId)
    .filter(
      (equipamento) =>
        equipamento.ativo || Boolean(inicial?.equipamentoIds?.includes(equipamento.id)),
    );

  function aoEscolherCliente(novoClienteId: string) {
    const locaisDoCliente = locaisAtivosDoCliente(locais, novoClienteId);
    const unico = locaisDoCliente.length === 1 ? locaisDoCliente[0].id : '';
    formulario.setValue('localId', unico, { shouldValidate: isSubmitted });
    formulario.setValue('equipamentoIds', []);
  }

  function aoEscolherLocal() {
    // Os equipamentos são do local: trocar o local desmarca todos.
    formulario.setValue('equipamentoIds', []);
  }

  async function enviar() {
    try {
      await aoSalvar(formulario.getValues());
    } catch (erro) {
      aplicarErroNoFormulario(formulario, erro, CAMPOS);
    }
  }

  return (
    <form onSubmit={formulario.handleSubmit(enviar)} noValidate className="space-y-6">
      <ErroFormulario mensagem={errors.root?.message} />

      <Card>
        <CardHeader>
          <CardTitle>Cliente e local</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <CampoSelecao
                control={formulario.control}
                name="clienteId"
                rotulo="Cliente"
                opcoes={opcoesClientes}
                opcaoVazia="Escolha o cliente"
                aoMudar={aoEscolherCliente}
              />
              <CampoSelecao
                control={formulario.control}
                name="localId"
                rotulo="Local"
                opcoes={opcoesLocais}
                opcaoVazia={clienteId ? 'Escolha o local' : 'Escolha o cliente primeiro'}
                disabled={!clienteId}
                aoMudar={aoEscolherLocal}
                descricao={
                  clienteId && opcoesLocais.length === 0
                    ? 'Este cliente ainda não tem locais. Cadastre um na tela do cliente.'
                    : undefined
                }
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipamentos</CardTitle>
          <CardDescription>Opcional. Marque os aparelhos que serão atendidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={formulario.control}
            name="equipamentoIds"
            render={({ field }) => (
              <ListaEquipamentos
                localEscolhido={Boolean(localId)}
                equipamentos={equipamentosDoLocal}
                marcados={field.value}
                aoMudar={field.onChange}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <CampoSelecao
                control={formulario.control}
                name="tipoServico"
                rotulo="Tipo de serviço"
                opcoes={OPCOES_TIPO}
              />
              <CampoSelecao
                control={formulario.control}
                name="prioridade"
                rotulo="Prioridade"
                opcoes={OPCOES_PRIORIDADE}
              />
            </div>
            <CampoAreaTexto
              control={formulario.control}
              name="problema"
              rotulo="Problema relatado"
              placeholder="Ex.: o aparelho liga, mas não gela; está pingando água na parede"
              rows={4}
            />
            <CampoTexto
              control={formulario.control}
              name="solicitante"
              rotulo="Solicitante"
              placeholder="Ex.: Enfermeira Carla, ramal 214"
              descricao="Quem pediu o serviço, do lado do cliente."
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : rotuloSalvar}
        </Button>
      </div>
    </form>
  );
}

type ListaEquipamentosProps = {
  localEscolhido: boolean;
  equipamentos: Equipamento[];
  marcados: string[];
  aoMudar: (ids: string[]) => void;
};

function ListaEquipamentos({
  localEscolhido,
  equipamentos,
  marcados,
  aoMudar,
}: ListaEquipamentosProps) {
  if (!localEscolhido) {
    return (
      <p className="text-sm text-muted-foreground">Escolha o local para ver os equipamentos.</p>
    );
  }
  if (equipamentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum equipamento cadastrado neste local.{' '}
        <Link to="/equipamentos/novo" className="text-primary underline-offset-4 hover:underline">
          Cadastrar equipamento
        </Link>
      </p>
    );
  }

  function alternar(id: string, marcado: boolean) {
    aoMudar(marcado ? [...marcados, id] : marcados.filter((item) => item !== id));
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {equipamentos.map((equipamento) => {
        const detalhes = [
          ROTULOS_TIPO_EQUIPAMENTO[equipamento.tipo],
          equipamento.marca,
          equipamento.patrimonio,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <li key={equipamento.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={marcados.includes(equipamento.id)}
                onChange={(evento) => alternar(equipamento.id, evento.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{equipamento.identificacao}</span>
                <span className="block text-xs text-muted-foreground">{detalhes}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
