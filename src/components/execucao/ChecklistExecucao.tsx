import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  RESPOSTAS_CHECKLIST,
  ROTULOS_RESPOSTA,
  type Execucao,
  type ItemChecklist,
  type RespostaChecklist,
} from '@/domain/ordem/execucao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { cn } from '@/lib/utils';
import { responderItemChecklist } from '@/services/execucaoService';

const CORES_RESPOSTA: Record<RespostaChecklist, string> = {
  ok: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  nao_conforme: 'bg-destructive text-white hover:bg-destructive/90',
  nao_se_aplica: 'bg-muted-foreground text-white hover:bg-muted-foreground/90',
};

type Props = {
  ordemId: string;
  itens: ItemChecklist[];
  /** Só o técnico da OS, com ela em execução. */
  editavel: boolean;
};

export function ChecklistExecucao({ ordemId, itens, editavel }: Props) {
  const cache = useQueryClient();
  const chave = chaves.execucao(ordemId);

  // Mostra a resposta na hora (o técnico está com pressa); se o servidor recusar, desfaz.
  const responder = useMutation({
    mutationFn: (dados: { posicao: number; resposta: RespostaChecklist | null; obs: string }) =>
      responderItemChecklist(ordemId, dados.posicao, dados.resposta, dados.obs),
    onMutate: async (dados) => {
      await cache.cancelQueries({ queryKey: chave });
      const antes = cache.getQueryData<Execucao>(chave);
      cache.setQueryData<Execucao>(
        chave,
        (atual) =>
          atual && {
            ...atual,
            checklist: atual.checklist.map((item) =>
              item.posicao === dados.posicao
                ? { ...item, resposta: dados.resposta, observacao: dados.obs.trim() || null }
                : item,
            ),
          },
      );
      return { antes };
    },
    onError: (erro, _dados, contexto) => {
      if (contexto?.antes) cache.setQueryData(chave, contexto.antes);
      toast.error(mensagemDeErro(erro));
    },
    onSettled: () => cache.invalidateQueries({ queryKey: chave }),
  });

  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Este tipo de serviço não tem checklist.</p>;
  }

  return (
    <ol className="divide-y">
      {itens.map((item) => (
        <li key={item.posicao} className="space-y-2 py-3 first:pt-0 last:pb-0">
          <p className="text-sm font-medium">
            {item.posicao}. {item.item}
          </p>
          {editavel ? (
            <div role="group" aria-label={`Resposta: ${item.item}`} className="flex gap-2">
              {RESPOSTAS_CHECKLIST.map((resposta) => {
                const marcada = item.resposta === resposta;
                return (
                  <Button
                    key={resposta}
                    type="button"
                    variant="outline"
                    aria-pressed={marcada}
                    className={cn('h-11 flex-1 px-2 text-xs', marcada && CORES_RESPOSTA[resposta])}
                    onClick={() =>
                      responder.mutate({
                        posicao: item.posicao,
                        // Tocar de novo na mesma resposta limpa o item.
                        resposta: marcada ? null : resposta,
                        obs: item.observacao ?? '',
                      })
                    }
                  >
                    {ROTULOS_RESPOSTA[resposta]}
                  </Button>
                );
              })}
            </div>
          ) : (
            <Badge
              variant="secondary"
              className={item.resposta ? CORES_RESPOSTA[item.resposta] : undefined}
            >
              {item.resposta ? ROTULOS_RESPOSTA[item.resposta] : 'Sem resposta'}
            </Badge>
          )}
          {editavel && item.resposta === 'nao_conforme' ? (
            <Textarea
              aria-label={`Observação: ${item.item}`}
              placeholder="O que foi encontrado? (ex.: dreno entupido, desobstruído)"
              defaultValue={item.observacao ?? ''}
              rows={2}
              maxLength={500}
              onBlur={(evento) => {
                if (evento.target.value.trim() === (item.observacao ?? '')) return;
                responder.mutate({
                  posicao: item.posicao,
                  resposta: item.resposta,
                  obs: evento.target.value,
                });
              }}
            />
          ) : (
            item.observacao && (
              <p className="text-sm text-muted-foreground">Observação: {item.observacao}</p>
            )
          )}
        </li>
      ))}
    </ol>
  );
}
