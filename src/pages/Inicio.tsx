import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AirVent,
  AlarmClock,
  CalendarCheck,
  ClipboardList,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { eDeHoje, estaAtrasada } from '@/domain/ordem/planejamento';
import { formatarNumeroOrdem, type Ordem } from '@/domain/ordem/tipos';
import { statusFinal } from '@/domain/ordem/transicoes';
import { EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { cn } from '@/lib/utils';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { listarClientes } from '@/services/clienteService';
import { listarEquipamentos } from '@/services/equipamentoService';
import { listarOrdens } from '@/services/ordemService';

type CartaoResumoProps = {
  titulo: string;
  total: number | undefined;
  descricao: string;
  icone: LucideIcon;
  para: string;
  /** Destaca em vermelho quando há algo (ex.: OS atrasadas). */
  alerta?: boolean;
};

function CartaoResumo({
  titulo,
  total,
  descricao,
  icone: Icone,
  para,
  alerta = false,
}: CartaoResumoProps) {
  const destacar = alerta && Boolean(total);
  return (
    <Link
      to={para}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card
        className={cn(
          'transition-colors hover:border-primary/40',
          destacar && 'border-destructive/40 bg-destructive/5',
        )}
      >
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Icone className="size-4" aria-hidden />
            {titulo}
          </CardDescription>
          <CardTitle className={cn('text-3xl', destacar && 'text-destructive')}>
            {total ?? '–'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{descricao}</CardContent>
      </Card>
    </Link>
  );
}

// Painel operacional (seção 6). Preventivas vencendo chegam na etapa 8.
export function Inicio() {
  const organizacao = useOrganizacao();
  const agora = new Date();
  const hoje = format(agora, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const clientes = useQuery({
    queryKey: chaves.clientes(organizacao.id),
    queryFn: () => listarClientes(organizacao.id),
  });
  const equipamentos = useQuery({
    queryKey: chaves.equipamentos(organizacao.id),
    queryFn: () => listarEquipamentos(organizacao.id),
  });

  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });

  const emAndamento = ordens.data?.filter((ordem) => !statusFinal(ordem.status));
  const urgentes = emAndamento?.filter((ordem) => ordem.prioridade === 'urgente').length;
  const atrasadas = ordens.data?.filter((ordem) => estaAtrasada(ordem, agora)).length;
  const deHoje = (ordens.data ?? [])
    .filter((ordem) => eDeHoje(ordem, agora))
    .sort((a, b) => (a.agendadaPara ?? '').localeCompare(b.agendadaPara ?? ''));
  const totalClientes = clientes.data?.filter((cliente) => cliente.ativo).length;
  const totalEquipamentos = equipamentos.data?.filter((equipamento) => equipamento.ativo).length;

  return (
    <>
      <CabecalhoPagina titulo="Painel" descricao={<span className="capitalize">{hoje}</span>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CartaoResumo
          titulo="OS em andamento"
          total={emAndamento?.length}
          descricao="Ainda não concluídas nem canceladas"
          icone={ClipboardList}
          para="/ordens"
        />
        <CartaoResumo
          titulo="OS atrasadas"
          total={atrasadas}
          descricao="Horário passou e a execução não começou"
          icone={AlarmClock}
          para="/ordens?situacao=atrasadas"
          alerta
        />
        <CartaoResumo
          titulo="Atendimentos hoje"
          total={ordens.data ? deHoje.length : undefined}
          descricao="Marcados para hoje na agenda"
          icone={CalendarCheck}
          para="/agenda?visao=dia"
        />
        <CartaoResumo
          titulo="OS urgentes"
          total={urgentes}
          descricao="Em andamento com prioridade urgente"
          icone={Siren}
          para="/ordens?prioridade=urgente"
        />
        <CartaoResumo
          titulo="Clientes"
          total={totalClientes}
          descricao="Clientes ativos"
          icone={Users}
          para="/clientes"
        />
        <CartaoResumo
          titulo="Equipamentos"
          total={totalEquipamentos}
          descricao="Equipamentos ativos"
          icone={AirVent}
          para="/equipamentos"
        />
      </div>
      <AgendaDoDia ordens={deHoje} agora={agora} carregando={ordens.isPending} />
      <p className="mt-6 text-sm text-muted-foreground">
        Preventivas vencendo aparecem aqui na etapa 8.
      </p>
    </>
  );
}

function AgendaDoDia({
  ordens,
  agora,
  carregando,
}: {
  ordens: Ordem[];
  agora: Date;
  carregando: boolean;
}) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Agenda de hoje</CardTitle>
        <CardDescription>
          {carregando
            ? 'Carregando…'
            : ordens.length === 0
              ? 'Nenhum atendimento marcado para hoje.'
              : 'Em ordem de horário.'}
        </CardDescription>
      </CardHeader>
      {ordens.length > 0 && (
        <CardContent>
          <ul className="divide-y">
            {ordens.map((ordem) => (
              <li key={ordem.id}>
                <Link
                  to={`/ordens/${ordem.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      'w-12 shrink-0 text-sm font-semibold tabular-nums',
                      estaAtrasada(ordem, agora) && 'text-destructive',
                    )}
                  >
                    {ordem.agendadaPara && format(new Date(ordem.agendadaPara), 'HH:mm')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {formatarNumeroOrdem(ordem.numero)} · {ordem.clienteNome}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ordem.localNome} · {ordem.tecnicoNome ?? 'Sem técnico'}
                    </span>
                  </span>
                  <EtiquetaStatus status={ordem.status} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
