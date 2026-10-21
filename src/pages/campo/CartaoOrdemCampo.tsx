import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { EtiquetaPrioridade, EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { estaAtrasada } from '@/domain/ordem/planejamento';
import { formatarNumeroOrdem, type Ordem } from '@/domain/ordem/tipos';
import { cn } from '@/lib/utils';

/** Horário (se for hoje) ou dia e horário, para a lista do técnico. */
function quando(agendadaPara: string | null, agora: Date): string {
  if (!agendadaPara) return 'Sem horário';
  const data = new Date(agendadaPara);
  return isSameDay(data, agora)
    ? format(data, 'HH:mm')
    : format(data, "EEE dd/MM 'às' HH:mm", { locale: ptBR });
}

// Cartão grande, fácil de tocar: toda a área leva para a execução da OS.
export function CartaoOrdemCampo({ ordem, agora }: { ordem: Ordem; agora: Date }) {
  const atrasada = estaAtrasada(ordem, agora);
  const destacarPrioridade = ordem.prioridade === 'alta' || ordem.prioridade === 'urgente';

  return (
    <Link
      to={`/campo/ordens/${ordem.id}`}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs active:bg-muted',
        atrasada && 'border-destructive/40',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn('font-semibold tabular-nums', atrasada && 'text-destructive')}
            title={atrasada ? 'Atrasada' : undefined}
          >
            {quando(ordem.agendadaPara, agora)}
          </span>
          <span className="text-muted-foreground">{formatarNumeroOrdem(ordem.numero)}</span>
          <EtiquetaStatus status={ordem.status} />
          {destacarPrioridade && <EtiquetaPrioridade prioridade={ordem.prioridade} />}
        </p>
        <p className="truncate font-medium">{ordem.clienteNome}</p>
        <p className="truncate text-sm text-muted-foreground">{ordem.localNome}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
