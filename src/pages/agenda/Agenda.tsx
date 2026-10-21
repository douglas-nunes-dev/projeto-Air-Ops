import FullCalendar, { type EventChangeInfo } from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/react/interaction';
import listPlugin from '@fullcalendar/react/list';
import ptBrLocale from '@fullcalendar/react/locales/pt-br';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes, format } from 'date-fns';
import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { EtiquetaPrioridade } from '@/components/ordem/EtiquetasOrdem';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { AgendamentoFormulario } from '@/domain/ordem/planejamento';
import { formatarNumeroOrdem, type Ordem } from '@/domain/ordem/tipos';
import { tecnicosDaEmpresa } from '@/domain/organizacao/tipos';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { agendarOrdem, listarOrdens } from '@/services/ordemService';
import { listarMembros } from '@/services/organizacaoService';
import { DialogoAgendar } from '../ordens/DialogoAgendar';
import { aguardandoAgendamento, eventosDaAgenda, ordensNaAgenda } from './eventos';

const CLASSE_SELECAO =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-64 md:text-sm';

export function Agenda() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const cache = useQueryClient();
  const celular = useIsMobile();
  const [parametros, setParametros] = useSearchParams();
  const tecnicoId = parametros.get('tecnico') ?? '';
  const visaoDia = parametros.get('visao') === 'dia';
  const [paraAgendar, setParaAgendar] = useState<Ordem | null>(null);

  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });
  // O técnico só recebe as OS dele (RLS): para ele não há o que filtrar.
  const membros = useQuery({
    queryKey: chaves.membros(organizacao.id),
    queryFn: () => listarMembros(organizacao.id),
    enabled: organizacao.podeAbrirOrdens,
  });
  const tecnicos = tecnicosDaEmpresa(membros.data ?? []);

  async function atualizar(mensagem: string) {
    await cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) });
    toast.success(mensagem);
  }

  async function salvarAgendamento(ordem: Ordem, dados: AgendamentoFormulario) {
    await agendarOrdem(ordem, dados);
    setParaAgendar(null);
    await atualizar(`${formatarNumeroOrdem(ordem.numero)} agendada.`);
  }

  // Arrastar ou esticar um bloco = reagendar com o mesmo técnico.
  async function moverNaAgenda(info: EventChangeInfo) {
    const ordem = ordens.data?.find((item) => item.id === info.event.id);
    const inicio = info.event.start;
    const fim = info.event.end;
    if (!ordem || !ordem.tecnicoId || !inicio || !fim) {
      info.revert();
      return;
    }
    try {
      await agendarOrdem(ordem, {
        tecnicoId: ordem.tecnicoId,
        data: format(inicio, 'yyyy-MM-dd'),
        hora: format(inicio, 'HH:mm'),
        duracaoMinutos: Math.min(Math.max(differenceInMinutes(fim, inicio), 15), 720),
      });
      await atualizar(
        `${formatarNumeroOrdem(ordem.numero)} reagendada para ${format(inicio, "dd/MM 'às' HH:mm")}.`,
      );
    } catch (erro) {
      info.revert();
      toast.error(mensagemDeErro(erro));
    }
  }

  function escolherTecnico(id: string) {
    const novos = new URLSearchParams(parametros);
    if (id) novos.set('tecnico', id);
    else novos.delete('tecnico');
    setParametros(novos, { replace: true });
  }

  if (ordens.isPending) return <CarregandoLista linhas={8} />;
  if (ordens.isError) {
    return <ErroConsulta erro={ordens.error} aoTentarDeNovo={() => ordens.refetch()} />;
  }

  const eventos = eventosDaAgenda(
    ordensNaAgenda(ordens.data, tecnicoId),
    new Date(),
    organizacao.podeAbrirOrdens,
  );
  const pendentes = aguardandoAgendamento(ordens.data);

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao="Atendimentos marcados por técnico. Arraste um bloco para mudar o horário."
      />

      {organizacao.podeAbrirOrdens && (
        <div className="mb-4 space-y-1.5">
          <Label htmlFor="agenda-tecnico">Técnico</Label>
          <select
            id="agenda-tecnico"
            className={CLASSE_SELECAO}
            value={tecnicoId}
            onChange={(evento) => escolherTecnico(evento.target.value)}
          >
            <option value="">Todos os técnicos</option>
            {tecnicos.map((tecnico) => (
              <option key={tecnico.usuarioId} value={tecnico.usuarioId}>
                {tecnico.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <div className="calendario-airops rounded-lg border bg-background p-2 sm:p-4">
          <FullCalendar
            plugins={[timeGridPlugin, listPlugin, interactionPlugin, classicThemePlugin]}
            locale={ptBrLocale}
            initialView={celular || visaoDia ? 'timeGridDay' : 'timeGridWeek'}
            headerToolbar={{
              start: 'prev,next today',
              center: 'title',
              end: celular ? 'timeGridDay,listWeek' : 'timeGridDay,timeGridWeek,listWeek',
            }}
            allDaySlot={false}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            nowIndicator
            height="auto"
            events={eventos}
            eventClick={(info) => navegar(`/ordens/${info.event.id}`)}
            eventDrop={moverNaAgenda}
            eventResize={moverNaAgenda}
          />
        </div>

        {organizacao.podeAbrirOrdens && (
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Aguardando agendamento</CardTitle>
              <CardDescription>
                {pendentes.length === 0
                  ? 'Nenhuma OS esperando data e técnico.'
                  : 'Abertas e pausadas, das mais urgentes para as outras.'}
              </CardDescription>
            </CardHeader>
            {pendentes.length > 0 && (
              <CardContent>
                <ul className="space-y-3">
                  {pendentes.map((ordem) => (
                    <li key={ordem.id} className="space-y-1.5 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/ordens/${ordem.id}`}
                          className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                          {formatarNumeroOrdem(ordem.numero)}
                        </Link>
                        <EtiquetaPrioridade prioridade={ordem.prioridade} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ordem.clienteNome} · {ordem.localNome}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setParaAgendar(ordem)}
                      >
                        <CalendarPlus />
                        Agendar
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {paraAgendar && (
        <DialogoAgendar
          ordem={paraAgendar}
          aberto
          aoMudarAberto={(aberto) => !aberto && setParaAgendar(null)}
          aoSalvar={(dados) => salvarAgendamento(paraAgendar, dados)}
        />
      )}
    </>
  );
}
