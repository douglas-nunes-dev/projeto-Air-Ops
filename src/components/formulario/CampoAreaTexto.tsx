import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

type CampoAreaTextoProps<T extends FieldValues, TSaida> = {
  control: Control<T, unknown, TSaida>;
  name: Path<T>;
  rotulo: string;
} & Omit<ComponentProps<typeof Textarea>, 'name' | 'id'>;

export function CampoAreaTexto<T extends FieldValues, TSaida = T>({
  control,
  name,
  rotulo,
  ...propsTextarea
}: CampoAreaTextoProps<T, TSaida>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{rotulo}</FieldLabel>
          <Textarea {...propsTextarea} {...field} id={name} aria-invalid={fieldState.invalid} />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
