import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type CampoTextoProps<T extends FieldValues, TSaida> = {
  control: Control<T, unknown, TSaida>;
  name: Path<T>;
  rotulo: string;
  descricao?: string;
} & Omit<ComponentProps<typeof Input>, 'name' | 'id'>;

export function CampoTexto<T extends FieldValues, TSaida = T>({
  control,
  name,
  rotulo,
  descricao,
  ...propsInput
}: CampoTextoProps<T, TSaida>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{rotulo}</FieldLabel>
          <Input {...propsInput} {...field} id={name} aria-invalid={fieldState.invalid} />
          {descricao && <FieldDescription>{descricao}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
