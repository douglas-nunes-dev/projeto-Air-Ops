import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export type OpcaoSelecao = { valor: string; rotulo: string };

type CampoSelecaoProps<T extends FieldValues, TSaida> = {
  control: Control<T, unknown, TSaida>;
  name: Path<T>;
  rotulo: string;
  opcoes: OpcaoSelecao[];
  /** Texto da primeira opção, que deixa o campo vazio (ex.: "Não informado"). */
  opcaoVazia?: string;
  descricao?: string;
} & Omit<ComponentProps<'select'>, 'name' | 'id' | 'children'>;

// Seleção nativa do navegador: no celular abre o seletor do próprio aparelho.
export function CampoSelecao<T extends FieldValues, TSaida = T>({
  control,
  name,
  rotulo,
  opcoes,
  opcaoVazia,
  descricao,
  className,
  ...propsSelect
}: CampoSelecaoProps<T, TSaida>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{rotulo}</FieldLabel>
          <select
            {...propsSelect}
            {...field}
            id={name}
            aria-invalid={fieldState.invalid}
            className={cn(
              'h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm',
              className,
            )}
          >
            {opcaoVazia !== undefined && <option value="">{opcaoVazia}</option>}
            {opcoes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
