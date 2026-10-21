import { CircleAlert } from 'lucide-react';

export function ErroFormulario({ mensagem }: { mensagem: string | undefined }) {
  if (!mensagem) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{mensagem}</p>
    </div>
  );
}
