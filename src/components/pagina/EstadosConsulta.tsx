import { CircleAlert, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { mensagemDeErro } from '@/lib/erros';

export function CarregandoLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, indice) => (
        <Skeleton key={indice} className="h-12 w-full" />
      ))}
    </div>
  );
}

type ErroConsultaProps = {
  erro: unknown;
  aoTentarDeNovo: () => void;
};

export function ErroConsulta({ erro, aoTentarDeNovo }: ErroConsultaProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
    >
      <CircleAlert className="size-8 text-destructive" aria-hidden />
      <p className="text-sm text-muted-foreground">{mensagemDeErro(erro)}</p>
      <Button variant="outline" size="sm" onClick={aoTentarDeNovo}>
        <RotateCw />
        Tentar de novo
      </Button>
    </div>
  );
}
