import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import type { AnotacoesExecucao } from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { salvarAnotacoes } from '@/services/execucaoService';

type Props = {
  ordem: Pick<Ordem, 'id' | 'organizacaoId'>;
  anotacoes: AnotacoesExecucao;
  editavel: boolean;
};

// Diagnóstico e materiais. Salva sozinho ao sair do campo: no celular, um botão "Salvar"
// esquecido seria anotação perdida.
export function SecaoAnotacoes({ ordem, anotacoes, editavel }: Props) {
  const cache = useQueryClient();
  const [diagnostico, setDiagnostico] = useState(anotacoes.diagnostico ?? '');
  const [materiais, setMateriais] = useState(anotacoes.materiais ?? '');

  const salvar = useMutation({
    mutationFn: () => salvarAnotacoes(ordem, { diagnostico, materiais }),
    onSuccess: () => cache.invalidateQueries({ queryKey: chaves.execucao(ordem.id) }),
  });

  function salvarSeMudou() {
    const mudou =
      diagnostico.trim() !== (anotacoes.diagnostico ?? '') ||
      materiais.trim() !== (anotacoes.materiais ?? '');
    if (mudou) salvar.mutate();
  }

  if (!editavel) {
    return (
      <dl className="grid gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Diagnóstico</dt>
          <dd className="whitespace-pre-line">{anotacoes.diagnostico ?? 'Não informado'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Materiais utilizados</dt>
          <dd className="whitespace-pre-line">{anotacoes.materiais ?? 'Não informado'}</dd>
        </div>
      </dl>
    );
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="diagnostico">Diagnóstico</FieldLabel>
        <Textarea
          id="diagnostico"
          placeholder="O que foi encontrado e a causa do problema"
          rows={4}
          maxLength={4000}
          value={diagnostico}
          onChange={(evento) => setDiagnostico(evento.target.value)}
          onBlur={salvarSeMudou}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="materiais">Materiais utilizados</FieldLabel>
        <Textarea
          id="materiais"
          placeholder="Ex.: 1 capacitor 35µF, 2 m de tubo de cobre 1/4"
          rows={3}
          maxLength={2000}
          value={materiais}
          onChange={(evento) => setMateriais(evento.target.value)}
          onBlur={salvarSeMudou}
        />
        <FieldDescription aria-live="polite">
          {salvar.isPending
            ? 'Salvando…'
            : salvar.isError
              ? mensagemDeErro(salvar.error)
              : salvar.isSuccess
                ? 'Salvo.'
                : 'Salva sozinho ao sair do campo.'}
        </FieldDescription>
      </Field>
    </div>
  );
}
