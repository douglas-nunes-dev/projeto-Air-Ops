import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AtividadeFormularioSchema, type AtividadeExecucao } from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/texto';
import { adicionarAtividade, removerAtividade } from '@/services/execucaoService';

type Props = {
  ordem: Pick<Ordem, 'id' | 'organizacaoId'>;
  atividades: AtividadeExecucao[];
  editavel: boolean;
};

export function SecaoAtividades({ ordem, atividades, editavel }: Props) {
  const cache = useQueryClient();
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const atualizar = () => cache.invalidateQueries({ queryKey: chaves.execucao(ordem.id) });

  const adicionar = useMutation({
    mutationFn: () => adicionarAtividade(ordem, { descricao }),
    onSuccess: async () => {
      setDescricao('');
      await atualizar();
    },
    onError: (falha) => setErro(mensagemDeErro(falha)),
  });

  const remover = useMutation({
    mutationFn: removerAtividade,
    onSuccess: atualizar,
    onError: (falha) => toast.error(mensagemDeErro(falha)),
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const leitura = AtividadeFormularioSchema.safeParse({ descricao });
    setErro(leitura.success ? null : leitura.error.issues[0].message);
    if (leitura.success) adicionar.mutate();
  }

  return (
    <div className="space-y-4">
      {atividades.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
      ) : (
        <ul className="divide-y">
          {atividades.map((atividade) => (
            <li key={atividade.id} className="flex items-start gap-2 py-2 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{atividade.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {formatarDataHora(atividade.criadoEm)}
                  {atividade.criadoPorNome && ` · ${atividade.criadoPorNome}`}
                </p>
              </div>
              {editavel && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover: ${atividade.descricao}`}
                  disabled={remover.isPending}
                  onClick={() => remover.mutate(atividade.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editavel && (
        <form onSubmit={aoEnviar} noValidate>
          <Field data-invalid={Boolean(erro)}>
            <FieldLabel htmlFor="nova-atividade">Nova atividade</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="nova-atividade"
                className="h-11"
                placeholder="Ex.: troca do capacitor do compressor"
                maxLength={500}
                value={descricao}
                aria-invalid={Boolean(erro)}
                onChange={(evento) => setDescricao(evento.target.value)}
              />
              <Button type="submit" className="h-11" disabled={adicionar.isPending}>
                <Plus />
                Adicionar
              </Button>
            </div>
            {erro && <FieldError>{erro}</FieldError>}
          </Field>
        </form>
      )}
    </div>
  );
}
