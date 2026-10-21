import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { aplicarErroNoFormulario } from '@/components/formulario/aplicarErro';
import { CampoAreaTexto } from '@/components/formulario/CampoAreaTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import {
  CancelamentoFormularioSchema,
  type CancelamentoFormulario,
} from '@/domain/ordem/planejamento';
import { formatarNumeroOrdem, type Ordem } from '@/domain/ordem/tipos';

type DialogoCancelarProps = {
  ordem: Ordem;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  aoSalvar: (dados: CancelamentoFormulario) => Promise<void>;
};

export function DialogoCancelar({ ordem, aberto, aoMudarAberto, aoSalvar }: DialogoCancelarProps) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar {formatarNumeroOrdem(ordem.numero)}?</DialogTitle>
          <DialogDescription>
            A OS fica guardada no histórico, mas não pode mais ser editada nem reaberta.
          </DialogDescription>
        </DialogHeader>
        {aberto && (
          <FormularioCancelamento aoSalvar={aoSalvar} aoVoltar={() => aoMudarAberto(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioCancelamento({
  aoSalvar,
  aoVoltar,
}: {
  aoSalvar: (dados: CancelamentoFormulario) => Promise<void>;
  aoVoltar: () => void;
}) {
  const formulario = useForm<CancelamentoFormulario>({
    resolver: zodResolver(CancelamentoFormularioSchema),
    defaultValues: { motivo: '' },
  });
  const { isSubmitting, errors } = formulario.formState;

  async function enviar() {
    try {
      await aoSalvar(formulario.getValues());
    } catch (erro) {
      aplicarErroNoFormulario(formulario, erro, ['motivo']);
    }
  }

  return (
    <form onSubmit={formulario.handleSubmit(enviar)} noValidate>
      <FieldGroup>
        <ErroFormulario mensagem={errors.root?.message} />
        <CampoAreaTexto
          control={formulario.control}
          name="motivo"
          rotulo="Motivo do cancelamento"
          placeholder="Ex.: cliente resolveu com outra empresa; aberta em duplicidade"
          rows={3}
        />
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={aoVoltar}>
          Voltar
        </Button>
        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {isSubmitting ? 'Cancelando…' : 'Cancelar OS'}
        </Button>
      </DialogFooter>
    </form>
  );
}
