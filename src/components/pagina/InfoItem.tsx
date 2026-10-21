import type { ReactNode } from 'react';

type InfoItemProps = {
  rotulo: string;
  children: ReactNode;
};

/** Par "rótulo: valor" nas telas de detalhe. Valor vazio mostra um traço. */
export function InfoItem({ rotulo, children }: InfoItemProps) {
  const vazio = children === null || children === undefined || children === '';
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm break-words">{vazio ? '—' : children}</dd>
    </div>
  );
}
