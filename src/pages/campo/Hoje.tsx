import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck } from 'lucide-react';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { useAgora } from '@/hooks/useAgora';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { usePessoaLogada } from '@/hooks/usePessoaLogada';
import { chaves } from '@/lib/chavesConsulta';
import { listarOrdens } from '@/services/ordemService';
import { GrupoDeOrdens } from './ListaCampo';
import { ordensDoTecnico, separarDoDia } from './separarOrdens';

// Tela inicial do técnico (seção 6): "Minhas OS de hoje", em ordem de horário.
export function Hoje() {
  const organizacao = useOrganizacao();
  const { usuarioId } = usePessoaLogada();
  const agora = useAgora(60_000);
  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Hoje</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(agora, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
      {ordens.isPending ? (
        <CarregandoLista linhas={3} />
      ) : ordens.isError ? (
        <ErroConsulta erro={ordens.error} aoTentarDeNovo={() => ordens.refetch()} />
      ) : (
        <ConteudoHoje
          grupos={separarDoDia(ordensDoTecnico(ordens.data, usuarioId), agora)}
          agora={agora}
        />
      )}
    </div>
  );
}

function ConteudoHoje({ grupos, agora }: { grupos: ReturnType<typeof separarDoDia>; agora: Date }) {
  const vazio =
    grupos.emAndamento.length === 0 && grupos.atrasadas.length === 0 && grupos.hoje.length === 0;
  if (vazio) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <CalendarCheck className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Nenhum atendimento para hoje.</p>
      </div>
    );
  }
  return (
    <>
      <GrupoDeOrdens titulo="Em andamento" ordens={grupos.emAndamento} agora={agora} />
      <GrupoDeOrdens titulo="Atrasadas de outros dias" ordens={grupos.atrasadas} agora={agora} />
      <GrupoDeOrdens titulo="Agendadas para hoje" ordens={grupos.hoje} agora={agora} />
    </>
  );
}
