import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { ChecklistExecucao } from '@/components/execucao/ChecklistExecucao';
import { GaleriaFotos } from '@/components/execucao/GaleriaFotos';
import { ProgressoChecklist, TempoDeExecucao } from '@/components/execucao/ResumoExecucao';
import { SecaoAnotacoes } from '@/components/execucao/SecaoAnotacoes';
import { SecaoAtividades } from '@/components/execucao/SecaoAtividades';
import { EtiquetaPrioridade, EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resumirEndereco } from '@/domain/cliente/local';
import {
  eTecnicoDaOrdem,
  execucaoComecou,
  podeEnviarFotos,
  podeIniciar,
  podePausar,
  podeRegistrarExecucao,
  progressoChecklist,
  type PausaFormulario,
} from '@/domain/ordem/execucao';
import { formatarNumeroOrdem, ROTULOS_TIPO_SERVICO, type Ordem } from '@/domain/ordem/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { usePessoaLogada } from '@/hooks/usePessoaLogada';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/texto';
import { listarLocaisDoCliente } from '@/services/clienteService';
import { buscarExecucao, prepararChecklist } from '@/services/execucaoService';
import { buscarOrdem, iniciarExecucao, pausarExecucao } from '@/services/ordemService';
import { NaoEncontrado } from '../NaoEncontrado';
import { DialogoPausar } from './DialogoPausar';

// Execução da OS no celular (etapa 4): iniciar, checklist, diagnóstico, atividades,
// materiais e fotos. Mobile-first: uma coluna, botões grandes, ação principal no topo.
export function ExecucaoOrdem() {
  const { id = '' } = useParams();
  const consulta = useQuery({ queryKey: chaves.ordem(id), queryFn: () => buscarOrdem(id) });

  if (consulta.isPending) return <CarregandoLista linhas={5} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  if (!consulta.data) {
    return <NaoEncontrado oQue="Ordem de serviço" voltarPara="/campo/ordens" feminino />;
  }
  return <TelaExecucao ordem={consulta.data} />;
}

function TelaExecucao({ ordem }: { ordem: Ordem }) {
  const pessoa = usePessoaLogada();
  const organizacao = useOrganizacao();
  const cache = useQueryClient();
  const [pausando, setPausando] = useState(false);
  const [iniciando, setIniciando] = useState(false);

  const execucao = useQuery({
    queryKey: chaves.execucao(ordem.id),
    queryFn: () => buscarExecucao(ordem.id),
    enabled: execucaoComecou(ordem),
  });

  const editavel = podeRegistrarExecucao(ordem, pessoa);

  // Checklist copiado do modelo na primeira vez que a OS aparece em execução
  // (normalmente logo depois de "Iniciar"; também cobre quem iniciou em outro aparelho).
  const preparou = useRef(false);
  const checklistVazio = execucao.data?.checklist.length === 0;
  useEffect(() => {
    if (!editavel || !checklistVazio || preparou.current) return;
    preparou.current = true;
    prepararChecklist(ordem.id)
      .then(() => cache.invalidateQueries({ queryKey: chaves.execucao(ordem.id) }))
      .catch(() => undefined);
  }, [editavel, checklistVazio, ordem.id, cache]);

  async function atualizarTudo() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: chaves.ordem(ordem.id) }),
      cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) }),
    ]);
  }

  async function iniciar() {
    setIniciando(true);
    try {
      await iniciarExecucao(ordem, pessoa);
      await atualizarTudo();
      toast.success(ordem.status === 'pausada' ? 'Atendimento retomado.' : 'Atendimento iniciado.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    } finally {
      setIniciando(false);
    }
  }

  async function pausar(dados: PausaFormulario) {
    await pausarExecucao(ordem, pessoa, dados);
    await atualizarTudo();
    setPausando(false);
    toast.success('Atendimento pausado.');
  }

  return (
    <div className="space-y-4 pb-4">
      <Link
        to="/campo/ordens"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Minhas OS
      </Link>

      <CabecalhoOrdem ordem={ordem} />

      {!eTecnicoDaOrdem(ordem, pessoa) && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Esta OS é de outro técnico: você pode acompanhar, mas só ele registra a execução.
        </p>
      )}

      <Card>
        <CardContent className="space-y-3">
          {execucaoComecou(ordem) && <TempoDeExecucao ordem={ordem} />}
          {podeIniciar(ordem, pessoa) && (
            <Button className="h-14 w-full text-base" disabled={iniciando} onClick={iniciar}>
              <Play />
              {iniciando
                ? 'Aguarde…'
                : ordem.status === 'pausada'
                  ? 'Retomar atendimento'
                  : 'Iniciar atendimento'}
            </Button>
          )}
          {podePausar(ordem, pessoa) && (
            <Button variant="outline" className="h-12 w-full" onClick={() => setPausando(true)}>
              <Pause />
              Pausar
            </Button>
          )}
          {ordem.status === 'agendada' && !podeIniciar(ordem, pessoa) && (
            <p className="text-sm text-muted-foreground">Aguardando o técnico iniciar.</p>
          )}
          {ordem.status === 'concluida' && (
            <p className="text-sm text-muted-foreground">Atendimento concluído.</p>
          )}
          {ordem.status === 'cancelada' && (
            <p className="text-sm text-muted-foreground">
              OS cancelada. {ordem.motivoCancelamento && `Motivo: ${ordem.motivoCancelamento}`}
            </p>
          )}
        </CardContent>
      </Card>

      <DialogoPausar aberto={pausando} aoMudarAberto={setPausando} aoPausar={pausar} />

      {execucaoComecou(ordem) &&
        (execucao.isPending ? (
          <CarregandoLista linhas={4} />
        ) : execucao.isError ? (
          <ErroConsulta erro={execucao.error} aoTentarDeNovo={() => execucao.refetch()} />
        ) : (
          <>
            {ordem.status === 'pausada' && eTecnicoDaOrdem(ordem, pessoa) && (
              <p className="rounded-md bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                Retome o atendimento para continuar o checklist e as anotações. As fotos continuam
                liberadas.
              </p>
            )}
            <Secao
              titulo={
                <>
                  Checklist <ProgressoChecklist {...progressoChecklist(execucao.data.checklist)} />
                </>
              }
            >
              <ChecklistExecucao
                ordemId={ordem.id}
                itens={execucao.data.checklist}
                editavel={editavel}
              />
            </Secao>
            <Secao titulo="Diagnóstico e materiais">
              <SecaoAnotacoes
                key={ordem.id}
                ordem={ordem}
                anotacoes={execucao.data.anotacoes}
                editavel={editavel}
              />
            </Secao>
            <Secao titulo="Atividades realizadas">
              <SecaoAtividades
                ordem={ordem}
                atividades={execucao.data.atividades}
                editavel={editavel}
              />
            </Secao>
            <Secao titulo="Fotos">
              <GaleriaFotos
                ordem={ordem}
                fotos={execucao.data.fotos}
                podeEnviar={podeEnviarFotos(ordem, pessoa)}
              />
            </Secao>
          </>
        ))}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CabecalhoOrdem({ ordem }: { ordem: Ordem }) {
  const locais = useQuery({
    queryKey: chaves.locaisDoCliente(ordem.clienteId),
    queryFn: () => listarLocaisDoCliente(ordem.clienteId),
  });
  const local = locais.data?.find((item) => item.id === ordem.localId);
  const endereco = local ? resumirEndereco(local) : '';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{formatarNumeroOrdem(ordem.numero)}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <EtiquetaStatus status={ordem.status} />
          <EtiquetaPrioridade prioridade={ordem.prioridade} />
          {ROTULOS_TIPO_SERVICO[ordem.tipoServico]}
        </p>
      </div>
      <div className="space-y-1">
        <p className="font-medium">{ordem.clienteNome}</p>
        <p className="text-sm">{ordem.localNome}</p>
        {endereco && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            <MapPin className="size-4" aria-hidden />
            {endereco}
          </a>
        )}
        {ordem.agendadaPara && (
          <p className="text-sm text-muted-foreground">
            Agendada para {formatarDataHora(ordem.agendadaPara)}
          </p>
        )}
        {ordem.solicitante && (
          <p className="text-sm text-muted-foreground">Solicitante: {ordem.solicitante}</p>
        )}
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">Problema relatado</p>
        <p className="text-sm whitespace-pre-line">{ordem.problema}</p>
      </div>
      {ordem.equipamentos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Equipamentos</p>
          <ul className="text-sm">
            {ordem.equipamentos.map((equipamento) => (
              <li key={equipamento.id}>{equipamento.identificacao}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
