import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { ErroDados } from '@/domain/erros';
import { mensagemDeErro } from '@/lib/erros';

/**
 * Mostra o erro no campo certo quando o banco diz qual foi (ex.: documento repetido);
 * senão, mostra no topo do formulário.
 */
export function aplicarErroNoFormulario<TCampos extends FieldValues, TSaida>(
  formulario: UseFormReturn<TCampos, unknown, TSaida>,
  erro: unknown,
  camposDoFormulario: readonly string[],
): void {
  if (erro instanceof ErroDados && erro.campo && camposDoFormulario.includes(erro.campo)) {
    formulario.setError(
      erro.campo as Path<TCampos>,
      { message: erro.message },
      { shouldFocus: true },
    );
    return;
  }
  formulario.setError('root', { message: mensagemDeErro(erro) });
}
