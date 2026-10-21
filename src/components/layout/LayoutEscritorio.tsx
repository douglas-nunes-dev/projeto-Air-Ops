import {
  AirVent,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { toast } from 'sonner';
import simbolo from '@/assets/simbolo-airops.png';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ROTULOS_PAPEL } from '@/domain/organizacao/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { useSessao } from '@/hooks/useSessao';
import { mensagemDeErro } from '@/lib/erros';
import { sair } from '@/services/authService';
import { BuscaGeral } from './BuscaGeral';
import { RodapeMenu } from './RodapeMenu';

type ItemMenu = {
  rotulo: string;
  icone: LucideIcon;
  /** Sem endereço = tela de uma etapa futura. */
  para?: string;
};

const ITENS_MENU: ItemMenu[] = [
  { rotulo: 'Painel', icone: LayoutDashboard, para: '/' },
  { rotulo: 'Ordens de serviço', icone: ClipboardList, para: '/ordens' },
  { rotulo: 'Agenda', icone: CalendarDays, para: '/agenda' },
  { rotulo: 'Clientes', icone: Users, para: '/clientes' },
  { rotulo: 'Equipamentos', icone: AirVent, para: '/equipamentos' },
  { rotulo: 'Configurações', icone: Settings },
];

function ItemDoMenu({ item }: { item: ItemMenu }) {
  const { setOpenMobile } = useSidebar();
  const Icone = item.icone;

  if (!item.para) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled aria-disabled>
          <Icone />
          <span>{item.rotulo}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge className="text-[10px] opacity-60">em breve</SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <NavLink to={item.para} end={item.para === '/'} onClick={() => setOpenMobile(false)}>
        {({ isActive }) => (
          <SidebarMenuButton isActive={isActive} tooltip={item.rotulo} asChild>
            <span>
              <Icone />
              <span>{item.rotulo}</span>
            </span>
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

function MenuLateral() {
  const organizacao = useOrganizacao();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={simbolo} alt="" className="h-8 w-auto" />
          <div className="min-w-0">
            <p className="text-base leading-tight font-semibold text-white">AirOps</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{organizacao.nome}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITENS_MENU.map((item) => (
                <ItemDoMenu key={item.rotulo} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <RodapeMenu />
    </Sidebar>
  );
}

function MenuUsuario() {
  const { usuario } = useSessao();
  const organizacao = useOrganizacao();
  const email = usuario?.email ?? '';
  const papeis = organizacao.papeis.map((papel) => ROTULOS_PAPEL[papel]).join(', ');

  async function aoSair() {
    try {
      await sair();
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Menu do usuário"
      >
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {email.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted-foreground">{papeis}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={aoSair}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BotaoNovaOrdem() {
  const organizacao = useOrganizacao();
  if (!organizacao.podeAbrirOrdens) return null;

  return (
    <Button asChild size="sm">
      <Link to="/ordens/nova" aria-label="Nova OS">
        <Plus />
        <span className="hidden sm:inline">Nova OS</span>
      </Link>
    </Button>
  );
}

export function LayoutEscritorio() {
  return (
    <SidebarProvider>
      <MenuLateral />
      <SidebarInset className="bg-muted/40">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger aria-label="Abrir ou fechar o menu" />
          <BuscaGeral />
          <div className="flex-1" />
          <BotaoNovaOrdem />
          <MenuUsuario />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
