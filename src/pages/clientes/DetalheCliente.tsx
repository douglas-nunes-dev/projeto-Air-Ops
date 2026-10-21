import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, MapPin, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { ConfirmarAcao } from '@/components/pagina/ConfirmarAcao';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { InfoItem } from '@/components/pagina/InfoItem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatarDocumento } from '@/domain/cliente/documento';
import {
  LOCAL_FORMULARIO_VAZIO,
  localParaFormulario,
  resumirEndereco,
  type LocalAtendimento,
  type LocalFormulario,
} from '@/domain/cliente/local';
import { ROTULOS_TIPO_PESSOA, type Cliente } from '@/domain/cliente/tipos';
import { ROTULOS_TIPO_EQUIPAMENTO } from '@/domain/equipamento/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarCep, formatarTelefone } from '@/lib/texto';
import {
  arquivarCliente,
  arquivarLocal,
  atualizarLocal,
  buscarCliente,
  criarLocal,
  listarLocaisDoCliente,
  reativarCliente,
  reativarLocal,
} from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { NaoEncontrado } from '../NaoEncontrado';
import { DialogoLocal } from './DialogoLocal';

export function DetalheCliente() {
  const { id = '' } = useParams();
  const organizacao = useOrganizacao();
  const cache = useQueryClient();
  const consulta = useQuery({ queryKey: chaves.cliente(id), queryFn: () => buscarCliente(id) });

  async function alternarArquivado(cliente: Cliente) {
    try {
      if (cliente.ativo) await arquivarCliente(cliente.id);
      else await reativarCliente(cliente.id);
      await Promise.all([
        cache.invalidateQueries({ queryKey: chaves.cliente(cliente.id) }),
        cache.invalidateQueries({ queryKey: chaves.clientes(organizacao.id) }),
      ]);
      toast.success(cliente.ativo ? 'Cliente arquivado.' : 'Cliente reativado.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    }
  }

  if (consulta.isPending) return <CarregandoLista linhas={6} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  const cliente = consulta.data;
  if (!cliente) return <NaoEncontrado oQue="Cliente" voltarPara="/clientes" />;

  return (
    <>
      <CabecalhoPagina
        titulo={cliente.nome}
        voltar={{ para: '/clientes', rotulo: 'Clientes' }}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {ROTULOS_TIPO_PESSOA[cliente.tipoPessoa]}
            {!cliente.ativo && <Badge variant="secondary">Arquivado</Badge>}
          </span>
        }
        acoes={
          organizacao.podeEditarCadastros && (
            <>
              <Button asChild variant="outline">
                <Link to={`/clientes/${cliente.id}/editar`}>
                  <Pencil />
                  Editar
                </Link>
              </Button>
              <ConfirmarAcao
                gatilho={
                  <Button variant="outline">
                    {cliente.ativo ? <Archive /> : <ArchiveRestore />}
                    {cliente.ativo ? 'Arquivar' : 'Reativar'}
                  </Button>
                }
                titulo={cliente.ativo ? 'Arquivar este cliente?' : 'Reativar este cliente?'}
                descricao={
                  cliente.ativo
                    ? 'Ele sai das listas, mas o histórico de atendimentos continua guardado. Dá para reativar depois.'
                    : 'Ele volta a aparecer nas listas.'
                }
                rotuloConfirmar={cliente.ativo ? 'Arquivar' : 'Reativar'}
                aoConfirmar={() => alternarArquivado(cliente)}
              />
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start lg:col-span-1">
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <InfoItem rotulo={cliente.tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'}>
                {cliente.documento && formatarDocumento(cliente.documento)}
              </InfoItem>
              <InfoItem rotulo="Pessoa de contato">{cliente.contatoNome}</InfoItem>
              <InfoItem rotulo="Telefone / WhatsApp">{formatarTelefone(cliente.telefone)}</InfoItem>
              <InfoItem rotulo="E-mail">{cliente.email}</InfoItem>
              <InfoItem rotulo="Observações">
                {cliente.observacoes && (
                  <span className="whitespace-pre-line">{cliente.observacoes}</span>
                )}
              </InfoItem>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <SecaoLocais cliente={cliente} />
          <SecaoEquipamentos cliente={cliente} />
        </div>
      </div>
    </>
  );
}

type EdicaoLocal = { titulo: string; local: LocalAtendimento | null } | null;

function SecaoLocais({ cliente }: { cliente: Cliente }) {
  const organizacao = useOrganizacao();
  const cache = useQueryClient();
  const [edicao, setEdicao] = useState<EdicaoLocal>(null);
  const consulta = useQuery({
    queryKey: chaves.locaisDoCliente(cliente.id),
    queryFn: () => listarLocaisDoCliente(cliente.id),
  });

  async function atualizarCache() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: chaves.locaisDoCliente(cliente.id) }),
      cache.invalidateQueries({ queryKey: chaves.locais(organizacao.id) }),
      cache.invalidateQueries({ queryKey: chaves.equipamentos(organizacao.id) }),
    ]);
  }

  async function salvar(dados: LocalFormulario) {
    if (edicao?.local) await atualizarLocal(edicao.local.id, dados);
    else await criarLocal(organizacao.id, cliente.id, dados);
    await atualizarCache();
    toast.success(edicao?.local ? 'Local atualizado.' : 'Local cadastrado.');
    setEdicao(null);
  }

  async function alternarArquivado(local: LocalAtendimento) {
    try {
      if (local.ativo) await arquivarLocal(local.id);
      else await reativarLocal(local.id);
      await atualizarCache();
      toast.success(local.ativo ? 'Local arquivado.' : 'Local reativado.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locais de atendimento</CardTitle>
        {organizacao.podeEditarCadastros && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEdicao({ titulo: 'Novo local', local: null })}
            >
              <Plus />
              Novo local
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {consulta.isPending ? (
          <CarregandoLista linhas={2} />
        ) : consulta.isError ? (
          <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum local cadastrado. Cadastre o endereço ou os setores onde ficam os equipamentos.
          </p>
        ) : (
          <ul className="divide-y">
            {consulta.data.map((local) => (
              <li key={local.id} className="flex items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {local.nome}
                      {!local.ativo && <Badge variant="secondary">Arquivado</Badge>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {resumirEndereco(local) || 'Sem endereço'}
                      {local.cep && ` · CEP ${formatarCep(local.cep)}`}
                    </p>
                  </div>
                </div>
                {organizacao.podeEditarCadastros && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Editar ${local.nome}`}
                      onClick={() => setEdicao({ titulo: 'Editar local', local })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${local.ativo ? 'Arquivar' : 'Reativar'} ${local.nome}`}
                      onClick={() => alternarArquivado(local)}
                    >
                      {local.ativo ? <Archive /> : <ArchiveRestore />}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <DialogoLocal
        aberto={edicao !== null}
        aoMudarAberto={(aberto) => !aberto && setEdicao(null)}
        titulo={edicao?.titulo ?? ''}
        valoresIniciais={edicao?.local ? localParaFormulario(edicao.local) : LOCAL_FORMULARIO_VAZIO}
        aoSalvar={salvar}
      />
    </Card>
  );
}

function SecaoEquipamentos({ cliente }: { cliente: Cliente }) {
  const organizacao = useOrganizacao();
  const consulta = useQuery({
    queryKey: [...chaves.equipamentos(organizacao.id), { clienteId: cliente.id }],
    queryFn: () => listarEquipamentos(organizacao.id, { clienteId: cliente.id }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipamentos</CardTitle>
        {organizacao.podeEditarCadastros && (
          <CardAction>
            <Button asChild size="sm" variant="outline">
              <Link to={`/equipamentos/novo?clienteId=${cliente.id}`}>
                <Plus />
                Novo equipamento
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {consulta.isPending ? (
          <CarregandoLista linhas={2} />
        ) : consulta.isError ? (
          <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />
        ) : consulta.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado.</p>
        ) : (
          <ul className="divide-y">
            {consulta.data.map((equipamento) => (
              <li key={equipamento.id}>
                <Link
                  to={`/equipamentos/${equipamento.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {equipamento.identificacao}
                      {!equipamento.ativo && <Badge variant="secondary">Arquivado</Badge>}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {ROTULOS_TIPO_EQUIPAMENTO[equipamento.tipo]} · {equipamento.localNome}
                    </span>
                  </span>
                  {equipamento.patrimonio && (
                    <Badge variant="outline" className="shrink-0">
                      {equipamento.patrimonio}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
