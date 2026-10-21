import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { aplicarErroNoFormulario } from '@/components/formulario/aplicarErro';
import { CampoAreaTexto } from '@/components/formulario/CampoAreaTexto';
import { CampoSelecao } from '@/components/formulario/CampoSelecao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { LocalAtendimento } from '@/domain/cliente/local';
import type { Cliente } from '@/domain/cliente/tipos';
import {
  EquipamentoFormularioSchema,
  PERIODICIDADES,
  ROTULOS_TIPO_EQUIPAMENTO,
  TIPOS_EQUIPAMENTO,
  type DadosEquipamento,
  type EquipamentoFormulario,
} from '@/domain/equipamento/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { listarClientes, listarLocais } from '@/services/clienteService';

const CAMPOS = [
  'localId',
  'identificacao',
  'tipo',
  'marca',
  'modelo',
  'capacidadeBtu',
  'numeroSerie',
  'patrimonio',
  'dataInstalacao',
  'periodicidadeDias',
  'observacoes',
];

const OPCOES_TIPO = TIPOS_EQUIPAMENTO.map((tipo) => ({
  valor: tipo,
  rotulo: ROTULOS_TIPO_EQUIPAMENTO[tipo],
}));

const OPCOES_PERIODICIDADE = PERIODICIDADES.map((periodicidade) => ({
  valor: String(periodicidade.dias),
  rotulo: `${periodicidade.rotulo} (${periodicidade.dias} dias)`,
}));

const CLASSE_SELECAO =
  'h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm';

type FormularioEquipamentoProps = {
  valoresIniciais: EquipamentoFormulario;
  clienteIdInicial: string;
  rotuloSalvar: string;
  aoSalvar: (dados: EquipamentoFormulario) => Promise<void>;
  aoCancelar: () => void;
};

// Busca clientes e locais antes de montar o formulário, para os campos já abrirem preenchidos.
export function FormularioEquipamento(props: FormularioEquipamentoProps) {
  const organizacao = useOrganizacao();
  const clientes = useQuery({
    queryKey: chaves.clientes(organizacao.id),
    queryFn: () => listarClientes(organizacao.id),
  });
  const locais = useQuery({
    queryKey: chaves.locais(organizacao.id),
    queryFn: () => listarLocais(organizacao.id),
  });

  if (clientes.isPending || locais.isPending) return <CarregandoLista linhas={6} />;
  if (clientes.isError) {
    return <ErroConsulta erro={clientes.error} aoTentarDeNovo={() => clientes.refetch()} />;
  }
  if (locais.isError) {
    return <ErroConsulta erro={locais.error} aoTentarDeNovo={() => locais.refetch()} />;
  }

  return <CamposEquipamento {...props} clientes={clientes.data} locais={locais.data} />;
}

type CamposEquipamentoProps = FormularioEquipamentoProps & {
  clientes: Cliente[];
  locais: LocalAtendimento[];
};

function CamposEquipamento({
  valoresIniciais,
  clienteIdInicial,
  rotuloSalvar,
  aoSalvar,
  aoCancelar,
  clientes,
  locais,
}: CamposEquipamentoProps) {
  const formulario = useForm<EquipamentoFormulario, unknown, DadosEquipamento>({
    resolver: zodResolver(EquipamentoFormularioSchema),
    defaultValues: valoresIniciais,
  });
  const { isSubmitting, errors } = formulario.formState;
  const [clienteId, setClienteId] = useState(clienteIdInicial);

  // Arquivados ficam de fora, menos o que já está escolhido (ao editar um equipamento antigo).
  const opcoesClientes = clientes
    .filter((cliente) => cliente.ativo || cliente.id === clienteIdInicial)
    .map((cliente) => ({ valor: cliente.id, rotulo: cliente.nome }));
  const opcoesLocais = locais
    .filter((local) => local.clienteId === clienteId)
    .filter((local) => local.ativo || local.id === valoresIniciais.localId)
    .map((local) => ({ valor: local.id, rotulo: local.nome }));

  function aoEscolherCliente(novoClienteId: string) {
    setClienteId(novoClienteId);
    const locaisDoCliente = locais.filter(
      (local) => local.clienteId === novoClienteId && local.ativo,
    );
    // Com um local só, já deixa escolhido.
    const unico = locaisDoCliente.length === 1 ? locaisDoCliente[0].id : '';
    formulario.setValue('localId', unico, { shouldValidate: formulario.formState.isSubmitted });
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
          <CardTitle>Onde fica</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="clienteId">Cliente</FieldLabel>
                <select
                  id="clienteId"
                  className={CLASSE_SELECAO}
                  value={clienteId}
                  onChange={(evento) => aoEscolherCliente(evento.target.value)}
                >
                  <option value="">Escolha o cliente</option>
                  {opcoesClientes.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </Field>
              <CampoSelecao
                control={formulario.control}
                name="localId"
                rotulo="Local"
                opcoes={opcoesLocais}
                opcaoVazia={clienteId ? 'Escolha o local' : 'Escolha o cliente primeiro'}
                disabled={!clienteId}
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
          <CardTitle>Identificação e dados técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <CampoTexto
                control={formulario.control}
                name="identificacao"
                rotulo="Identificação"
                placeholder="Ex.: Split Sala 2, Fancoil UTI"
                descricao="Como a equipe reconhece este aparelho."
              />
              <CampoSelecao
                control={formulario.control}
                name="tipo"
                rotulo="Tipo"
                opcoes={OPCOES_TIPO}
              />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <CampoTexto control={formulario.control} name="marca" rotulo="Marca" />
              <CampoTexto control={formulario.control} name="modelo" rotulo="Modelo" />
              <CampoTexto
                control={formulario.control}
                name="capacidadeBtu"
                rotulo="Capacidade (BTU/h)"
                inputMode="numeric"
                placeholder="Ex.: 12000"
              />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <CampoTexto
                control={formulario.control}
                name="numeroSerie"
                rotulo="Número de série"
              />
              <CampoTexto
                control={formulario.control}
                name="patrimonio"
                rotulo="Patrimônio"
                descricao="Etiqueta do cliente, se houver."
              />
              <CampoTexto
                control={formulario.control}
                name="dataInstalacao"
                rotulo="Data de instalação"
                type="date"
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manutenção preventiva</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <CampoSelecao
              control={formulario.control}
              name="periodicidadeDias"
              rotulo="Periodicidade"
              opcoes={OPCOES_PERIODICIDADE}
              opcaoVazia="Sem preventiva programada"
              descricao="A lista de preventivas vencendo usa esta informação (etapa 8)."
            />
            <CampoAreaTexto
              control={formulario.control}
              name="observacoes"
              rotulo="Observações"
              rows={3}
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
