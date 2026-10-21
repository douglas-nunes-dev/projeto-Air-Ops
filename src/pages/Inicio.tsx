import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AirVent, ClipboardList, Siren, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { statusFinal } from '@/domain/ordem/transicoes';
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
};

function CartaoResumo({ titulo, total, descricao, icone: Icone, para }: CartaoResumoProps) {
  return (
    <Link
      to={para}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="transition-colors hover:border-primary/40">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Icone className="size-4" aria-hidden />
            {titulo}
          </CardDescription>
          <CardTitle className="text-3xl">{total ?? '–'}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{descricao}</CardContent>
      </Card>
    </Link>
  );
}

// Painel provisório: OS atrasadas, agenda do dia e preventivas (mockup) chegam nas próximas etapas.
export function Inicio() {
  const organizacao = useOrganizacao();
  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

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
  const totalClientes = clientes.data?.filter((cliente) => cliente.ativo).length;
  const totalEquipamentos = equipamentos.data?.filter((equipamento) => equipamento.ativo).length;

  return (
    <>
      <CabecalhoPagina titulo="Painel" descricao={<span className="capitalize">{hoje}</span>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoResumo
          titulo="OS em andamento"
          total={emAndamento?.length}
          descricao="Ainda não concluídas nem canceladas"
          icone={ClipboardList}
          para="/ordens"
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
      <p className="mt-6 text-sm text-muted-foreground">
        OS atrasadas, agenda do dia e preventivas vencendo aparecem aqui nas próximas etapas.
      </p>
    </>
  );
}
