import { useQuery } from '@tanstack/react-query';
import { Clock, Pause } from 'lucide-react';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatarDuracao,
  motivoDaPausa,
  progressoChecklist,
  tempoTrabalhado,
} from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { useAgora } from '@/hooks/useAgora';
import { chaves } from '@/lib/chavesConsulta';
import { buscarExecucao } from '@/services/execucaoService';
import { listarEventosDaOrdem } from '@/services/ordemService';
import { AssinaturaRegistrada } from './AssinaturaRegistrada';
import { ChecklistExecucao } from './ChecklistExecucao';
import { GaleriaFotos } from './GaleriaFotos';
import { SecaoAnotacoes } from './SecaoAnotacoes';
import { SecaoAtividades } from './SecaoAtividades';

/** Tempo trabalhado e, se pausada, o motivo. Atualiza sozinho enquanto a OS está em execução. */
export function TempoDeExecucao({ ordem }: { ordem: Pick<Ordem, 'id' | 'status'> }) {
  const agora = useAgora(30_000);
  const eventos = useQuery({
    queryKey: chaves.eventosDaOrdem(ordem.id),
    queryFn: () => listarEventosDaOrdem(ordem.id),
  });
  if (!eventos.data) return null;

  const tempo = formatarDuracao(tempoTrabalhado(eventos.data, agora));
  const motivo = ordem.status === 'pausada' ? motivoDaPausa(eventos.data) : null;
  return (
    <div className="space-y-1 text-sm">
      <p className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" aria-hidden />
        Tempo trabalhado: <span className="font-semibold tabular-nums">{tempo}</span>
      </p>
      {motivo && (
        <p className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
          <Pause className="size-4" aria-hidden />
          Pausada: {motivo}
        </p>
      )}
    </div>
  );
}

// Acompanhamento no escritório (admin e gestor): tudo o que o técnico registrou, só leitura.
export function ResumoExecucao({ ordem }: { ordem: Ordem }) {
  const execucao = useQuery({
    queryKey: chaves.execucao(ordem.id),
    queryFn: () => buscarExecucao(ordem.id),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execução</CardTitle>
        <CardDescription>Registrado pelo técnico em campo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TempoDeExecucao ordem={ordem} />
        {execucao.isPending ? (
          <CarregandoLista linhas={3} />
        ) : execucao.isError ? (
          <ErroConsulta erro={execucao.error} aoTentarDeNovo={() => execucao.refetch()} />
        ) : (
          <>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                Checklist <ProgressoChecklist {...progressoChecklist(execucao.data.checklist)} />
              </h3>
              <ChecklistExecucao
                ordemId={ordem.id}
                itens={execucao.data.checklist}
                editavel={false}
              />
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Anotações</h3>
              <SecaoAnotacoes ordem={ordem} anotacoes={execucao.data.anotacoes} editavel={false} />
            </section>
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Atividades</h3>
              <SecaoAtividades
                ordem={ordem}
                atividades={execucao.data.atividades}
                editavel={false}
              />
            </section>
            {execucao.data.assinatura && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Assinatura do cliente</h3>
                <AssinaturaRegistrada ordemId={ordem.id} assinatura={execucao.data.assinatura} />
              </section>
            )}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Fotos</h3>
              <GaleriaFotos ordem={ordem} fotos={execucao.data.fotos} podeEnviar={false} />
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ProgressoChecklist({ respondidos, total }: { respondidos: number; total: number }) {
  if (total === 0) return null;
  return (
    <span className="font-normal text-muted-foreground">
      ({respondidos} de {total})
    </span>
  );
}
