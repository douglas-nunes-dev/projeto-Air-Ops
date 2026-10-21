import type { Ordem } from '@/domain/ordem/tipos';
import { CartaoOrdemCampo } from './CartaoOrdemCampo';

/** Grupo de OS com título (ex.: "Em andamento"); some se estiver vazio. */
export function GrupoDeOrdens({
  titulo,
  ordens,
  agora,
}: {
  titulo: string;
  ordens: Ordem[];
  agora: Date;
}) {
  if (ordens.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {titulo} ({ordens.length})
      </h2>
      <ul className="space-y-2">
        {ordens.map((ordem) => (
          <li key={ordem.id}>
            <CartaoOrdemCampo ordem={ordem} agora={agora} />
          </li>
        ))}
      </ul>
    </section>
  );
}
