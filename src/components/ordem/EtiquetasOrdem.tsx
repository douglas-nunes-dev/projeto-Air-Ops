import { Badge } from '@/components/ui/badge';
import {
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  type Prioridade,
  type StatusOrdem,
} from '@/domain/ordem/tipos';
import { cn } from '@/lib/utils';

const CORES_STATUS: Record<StatusOrdem, string> = {
  aberta: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  agendada: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  em_execucao: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  pausada: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  concluida: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  cancelada: 'bg-muted text-muted-foreground',
};

// Baixa e média ficam discretas; só alta e urgente chamam atenção.
const CORES_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'border-border text-muted-foreground',
  media: 'border-border text-foreground',
  alta: 'border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300',
  urgente: 'border-transparent bg-destructive text-white',
};

export function EtiquetaStatus({ status }: { status: StatusOrdem }) {
  return (
    <Badge variant="secondary" className={CORES_STATUS[status]}>
      {ROTULOS_STATUS[status]}
    </Badge>
  );
}

export function EtiquetaPrioridade({
  prioridade,
  className,
}: {
  prioridade: Prioridade;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(CORES_PRIORIDADE[prioridade], className)}>
      {ROTULOS_PRIORIDADE[prioridade]}
    </Badge>
  );
}
