import { CalendarCheck, ClipboardList, CloudOff, UserRound, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import simbolo from '@/assets/simbolo-airops.png';
import { useEnvioDeFotos } from '@/hooks/useEnvioDeFotos';
import { useFotosPendentes } from '@/hooks/useFotosPendentes';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { cn } from '@/lib/utils';

const ITENS: { rotulo: string; icone: LucideIcon; para: string }[] = [
  { rotulo: 'Hoje', icone: CalendarCheck, para: '/campo' },
  { rotulo: 'Minhas OS', icone: ClipboardList, para: '/campo/ordens' },
  { rotulo: 'Perfil', icone: UserRound, para: '/campo/perfil' },
];

// Layout do técnico no celular (seção 6): menu inferior, ao alcance do polegar.
export function LayoutTecnico() {
  const organizacao = useOrganizacao();
  const pendentes = useFotosPendentes();
  useEnvioDeFotos();

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4">
        <img src={simbolo} alt="" className="h-7 w-auto" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{organizacao.nome}</p>
        {pendentes.length > 0 && (
          <span
            className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800 dark:bg-orange-950 dark:text-orange-200"
            role="status"
          >
            <CloudOff className="size-3.5" aria-hidden />
            {pendentes.length} foto(s) a enviar
          </span>
        )}
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-4 pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Menu do técnico"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-3">
          {ITENS.map(({ rotulo, icone: Icone, para }) => (
            <li key={para}>
              <NavLink
                to={para}
                end={para === '/campo'}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-xs',
                    isActive ? 'font-medium text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icone className="size-5" aria-hidden />
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
