import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type CampoTextoProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  rotulo: string;
  descricao?: string;
} & Omit<ComponentProps<typeof Input>, 'name' | 'id'>;

export function CampoTexto<T extends FieldValues>({
  control,
  name,
  rotulo,
  descricao,
  ...propsInput
}: CampoTextoProps<T>) {
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
