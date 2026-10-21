import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { useAgora } from '@/hooks/useAgora';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { usePessoaLogada } from '@/hooks/usePessoaLogada';
import { chaves } from '@/lib/chavesConsulta';
import { listarOrdens } from '@/services/ordemService';
import { GrupoDeOrdens } from './ListaCampo';
import { ordensDoTecnico, separarAbertas } from './separarOrdens';

// Todas as OS ainda abertas do técnico, de hoje e dos próximos dias.
export function MinhasOrdens() {
  const organizacao = useOrganizacao();
  const { usuarioId } = usePessoaLogada();
  const agora = useAgora(60_000);
  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });

  if (ordens.isPending) return <CarregandoLista linhas={4} />;
  if (ordens.isError) {
    return <ErroConsulta erro={ordens.error} aoTentarDeNovo={() => ordens.refetch()} />;
  }
  const { emAndamento, agendadas } = separarAbertas(ordensDoTecnico(ordens.data, usuarioId));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Minhas OS</h1>
      {emAndamento.length === 0 && agendadas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
          <ClipboardList className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Nenhuma OS atribuída a você.</p>
        </div>
      ) : (
        <>
          <GrupoDeOrdens titulo="Em andamento" ordens={emAndamento} agora={agora} />
          <GrupoDeOrdens titulo="Agendadas" ordens={agendadas} agora={agora} />
        </>
      )}
    </div>
  );
}
