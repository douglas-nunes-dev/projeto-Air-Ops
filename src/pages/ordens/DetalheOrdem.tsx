import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Ban, CalendarClock, CalendarPlus, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { EtiquetaPrioridade, EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { InfoItem } from '@/components/pagina/InfoItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DURACOES,
  fimDoAtendimento,
  podeAgendar,
  podeCancelar,
  type AgendamentoFormulario,
  type CancelamentoFormulario,
} from '@/domain/ordem/planejamento';
import {
  descreverEvento,
  formatarNumeroOrdem,
  ROTULOS_TIPO_SERVICO,
  type Ordem,
} from '@/domain/ordem/tipos';
import { podeEditarAbertura } from '@/domain/ordem/transicoes';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/texto';
import {
  agendarOrdem,
  buscarOrdem,
  cancelarOrdem,
  listarEventosDaOrdem,
} from '@/services/ordemService';
import { NaoEncontrado } from '../NaoEncontrado';
import { DialogoAgendar } from './DialogoAgendar';
import { DialogoCancelar } from './DialogoCancelar';

const CLASSE_LINK = 'text-primary underline-offset-4 hover:underline';

export function DetalheOrdem() {
  const { id = '' } = useParams();
  const organizacao = useOrganizacao();
  const consulta = useQuery({ queryKey: chaves.ordem(id), queryFn: () => buscarOrdem(id) });
  const cache = useQueryClient();
  const [dialogo, setDialogo] = useState<'agendar' | 'cancelar' | null>(null);

  async function depoisDeMudar(mensagem: string) {
    await Promise.all([
      cache.invalidateQueries({ queryKey: chaves.ordem(id) }),
      cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) }),
    ]);
    setDialogo(null);
    toast.success(mensagem);
  }

  async function agendar(ordem: Ordem, dados: AgendamentoFormulario) {
    await agendarOrdem(ordem, dados);
    const numero = formatarNumeroOrdem(ordem.numero);
    await depoisDeMudar(
      ordem.status === 'agendada' ? `${numero} reagendada.` : `${numero} agendada.`,
    );
  }

  async function cancelar(ordem: Ordem, dados: CancelamentoFormulario) {
    await cancelarOrdem(ordem, dados);
    await depoisDeMudar(`${formatarNumeroOrdem(ordem.numero)} cancelada.`);
  }

  if (consulta.isPending) return <CarregandoLista linhas={6} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  const ordem = consulta.data;
  if (!ordem) return <NaoEncontrado oQue="Ordem de serviço" voltarPara="/ordens" feminino />;

  const podeEditar = organizacao.podeAbrirOrdens && podeEditarAbertura(ordem.status);
  const mostrarAgendar = organizacao.podeAbrirOrdens && podeAgendar(ordem);
  const mostrarCancelar = organizacao.podeAbrirOrdens && podeCancelar(ordem);
  const fim = fimDoAtendimento(ordem);
  const duracao =
    DURACOES.find((item) => item.minutos === ordem.duracaoMinutos)?.rotulo ??
    `${ordem.duracaoMinutos} minutos`;

  return (
    <>
      <CabecalhoPagina
        titulo={formatarNumeroOrdem(ordem.numero)}
        voltar={{ para: '/ordens', rotulo: 'Ordens de serviço' }}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <EtiquetaStatus status={ordem.status} />
            <EtiquetaPrioridade prioridade={ordem.prioridade} />
            {ROTULOS_TIPO_SERVICO[ordem.tipoServico]}
          </span>
        }
        acoes={
          <>
            {mostrarAgendar && (
              <Button onClick={() => setDialogo('agendar')}>
                <CalendarPlus />
                {ordem.status === 'agendada' ? 'Reagendar' : 'Agendar'}
              </Button>
            )}
            {podeEditar && (
              <Button asChild variant="outline">
                <Link to={`/ordens/${ordem.id}/editar`}>
                  <Pencil />
                  Editar
                </Link>
              </Button>
            )}
            {mostrarCancelar && (
              <Button variant="outline" onClick={() => setDialogo('cancelar')}>
                <Ban />
                Cancelar OS
              </Button>
            )}
          </>
        }
      />

      <DialogoAgendar
        ordem={ordem}
        aberto={dialogo === 'agendar'}
        aoMudarAberto={(aberto) => setDialogo(aberto ? 'agendar' : null)}
        aoSalvar={(dados) => agendar(ordem, dados)}
      />
      <DialogoCancelar
        ordem={ordem}
        aberto={dialogo === 'cancelar'}
        aoMudarAberto={(aberto) => setDialogo(aberto ? 'cancelar' : null)}
        aoSalvar={(dados) => cancelar(ordem, dados)}
      />

      {ordem.status === 'cancelada' && ordem.motivoCancelamento && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border bg-background p-4 text-sm">
          <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p>
            <span className="font-medium">Cancelada.</span> Motivo: {ordem.motivoCancelamento}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 self-start lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Cliente e local</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <InfoItem rotulo="Cliente">
                  <Link to={`/clientes/${ordem.clienteId}`} className={CLASSE_LINK}>
                    {ordem.clienteNome}
                  </Link>
                </InfoItem>
                <InfoItem rotulo="Local">{ordem.localNome}</InfoItem>
                <InfoItem rotulo="Solicitante">{ordem.solicitante}</InfoItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planejamento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <InfoItem rotulo="Técnico">{ordem.tecnicoNome ?? 'A definir'}</InfoItem>
                <InfoItem rotulo="Agendada para">
                  {ordem.agendadaPara ? formatarDataHora(ordem.agendadaPara) : 'A definir'}
                </InfoItem>
                {ordem.agendadaPara && (
                  <InfoItem rotulo="Duração prevista">
                    {duracao}
                    {fim && ` (até ${format(fim, 'HH:mm')})`}
                  </InfoItem>
                )}
              </dl>
              {!ordem.agendadaPara && mostrarAgendar && (
                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-4 shrink-0" aria-hidden />
                  Use &quot;Agendar&quot; para escolher o técnico, o dia e o horário.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Problema relatado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{ordem.problema}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Equipamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {ordem.equipamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum equipamento informado.</p>
              ) : (
                <ul className="space-y-2">
                  {ordem.equipamentos.map((equipamento) => (
                    <li key={equipamento.id} className="text-sm">
                      <Link to={`/equipamentos/${equipamento.id}`} className={CLASSE_LINK}>
                        {equipamento.identificacao}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Historico ordem={ordem} />
        </div>
      </div>
    </>
  );
}

function Historico({ ordem }: { ordem: Ordem }) {
  const eventos = useQuery({
    queryKey: chaves.eventosDaOrdem(ordem.id),
    queryFn: () => listarEventosDaOrdem(ordem.id),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico</CardTitle>
      </CardHeader>
      <CardContent>
        {eventos.isPending ? (
          <CarregandoLista linhas={2} />
        ) : eventos.isError ? (
          <p className="text-sm text-destructive">{mensagemDeErro(eventos.error)}</p>
        ) : (
          <ol className="space-y-4 border-l pl-4">
            {eventos.data.map((evento) => (
              <li key={evento.id} className="relative">
                <span
                  className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium">{descreverEvento(evento)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarDataHora(evento.criadoEm)}
                  {evento.usuarioNome && ` · ${evento.usuarioNome}`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
