import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  MOTIVOS_PAUSA,
  PausaFormularioSchema,
  type PausaFormulario,
} from '@/domain/ordem/execucao';
import { mensagemDeErro } from '@/lib/erros';
import { cn } from '@/lib/utils';

type Props = {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  aoPausar: (dados: PausaFormulario) => Promise<void>;
};

// Motivos prontos em botões grandes (um toque); "Outro" abre um campo para digitar.
export function DialogoPausar({ aberto, aoMudarAberto, aoPausar }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pausar o atendimento</DialogTitle>
          <DialogDescription>
            O tempo para de contar até você retomar. O motivo aparece para o gestor.
          </DialogDescription>
        </DialogHeader>
        {aberto && <FormularioPausa aoPausar={aoPausar} aoVoltar={() => aoMudarAberto(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioPausa({
  aoPausar,
  aoVoltar,
}: {
  aoPausar: (dados: PausaFormulario) => Promise<void>;
  aoVoltar: () => void;
}) {
  const [opcao, setOpcao] = useState('');
  const [outro, setOutro] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const dados = { opcao, outro };
    const leitura = PausaFormularioSchema.safeParse(dados);
    if (!leitura.success) {
      setErro(leitura.error.issues[0].message);
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await aoPausar(dados);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4">
      <div role="radiogroup" aria-label="Motivo da pausa" className="grid gap-2">
        {[...MOTIVOS_PAUSA, 'outro'].map((motivo) => (
          <Button
            key={motivo}
            type="button"
            role="radio"
            aria-checked={opcao === motivo}
            variant="outline"
            className={cn(
              'h-11 justify-start',
              opcao === motivo && 'border-primary bg-primary/10 text-primary',
            )}
            onClick={() => setOpcao(motivo)}
          >
            {motivo === 'outro' ? 'Outro motivo' : motivo}
          </Button>
        ))}
      </div>
      {opcao === 'outro' && (
        <Field>
          <FieldLabel htmlFor="motivo-outro">Qual o motivo?</FieldLabel>
          <Input
            id="motivo-outro"
            className="h-11"
            maxLength={200}
            value={outro}
            onChange={(evento) => setOutro(evento.target.value)}
          />
        </Field>
      )}
      {erro && <FieldError>{erro}</FieldError>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={aoVoltar}>
          Voltar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Pausando…' : 'Pausar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
