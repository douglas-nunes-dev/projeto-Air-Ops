import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type CabecalhoPaginaProps = {
  titulo: string;
  descricao?: ReactNode;
  /** Botões à direita do título (ex.: "Novo cliente"). */
  acoes?: ReactNode;
  voltar?: { para: string; rotulo: string };
};

export function CabecalhoPagina({ titulo, descricao, acoes, voltar }: CabecalhoPaginaProps) {
  return (
    <div className="mb-6 space-y-2">
      {voltar && (
        <Link
          to={voltar.para}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descricao && <div className="text-sm text-muted-foreground">{descricao}</div>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </div>
  );
}
