import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { aplicarErroNoFormulario } from '@/components/formulario/aplicarErro';
import { CampoAreaTexto } from '@/components/formulario/CampoAreaTexto';
import { CampoSelecao } from '@/components/formulario/CampoSelecao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
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
  LocalFormularioSchema,
  UFS,
  type DadosLocal,
  type LocalFormulario,
} from '@/domain/cliente/local';

const CAMPOS = [
  'nome',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'uf',
  'observacoes',
];

const OPCOES_UF = UFS.map((uf) => ({ valor: uf, rotulo: uf }));

type DialogoLocalProps = {
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  titulo: string;
  valoresIniciais: LocalFormulario;
  aoSalvar: (dados: LocalFormulario) => Promise<void>;
};

// O formulário só existe enquanto o diálogo está aberto: cada abertura começa limpa.
export function DialogoLocal({ aberto, aoMudarAberto, ...props }: DialogoLocalProps) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {aberto && <FormularioLocal {...props} aoCancelar={() => aoMudarAberto(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioLocal({
  titulo,
  valoresIniciais,
  aoSalvar,
  aoCancelar,
}: Omit<DialogoLocalProps, 'aberto' | 'aoMudarAberto'> & { aoCancelar: () => void }) {
  const formulario = useForm<LocalFormulario, unknown, DadosLocal>({
    resolver: zodResolver(LocalFormularioSchema),
    defaultValues: valoresIniciais,
  });
  const { isSubmitting, errors } = formulario.formState;

  async function enviar() {
    try {
      await aoSalvar(formulario.getValues());
    } catch (erro) {
      aplicarErroNoFormulario(formulario, erro, CAMPOS);
    }
  }

  return (
    <form onSubmit={formulario.handleSubmit(enviar)} noValidate>
      <DialogHeader className="mb-4">
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>
          Um endereço, unidade ou setor do cliente. Ex.: &quot;Matriz&quot;, &quot;Bloco B —
          UTI&quot;.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <ErroFormulario mensagem={errors.root?.message} />
        <CampoTexto control={formulario.control} name="nome" rotulo="Nome do local" />
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <CampoTexto
            control={formulario.control}
            name="cep"
            rotulo="CEP"
            inputMode="numeric"
            placeholder="37900-000"
          />
          <CampoTexto control={formulario.control} name="logradouro" rotulo="Rua / avenida" />
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <CampoTexto control={formulario.control} name="numero" rotulo="Número" />
          <CampoTexto control={formulario.control} name="complemento" rotulo="Complemento" />
        </div>
        <CampoTexto control={formulario.control} name="bairro" rotulo="Bairro" />
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <CampoTexto control={formulario.control} name="cidade" rotulo="Cidade" />
          <CampoSelecao
            control={formulario.control}
            name="uf"
            rotulo="UF"
            opcoes={OPCOES_UF}
            opcaoVazia="—"
          />
        </div>
        <CampoAreaTexto
          control={formulario.control}
          name="observacoes"
          rotulo="Observações"
          placeholder="Ex.: falar com a portaria; acesso pelo estacionamento"
          rows={2}
        />
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar local'}
        </Button>
      </DialogFooter>
    </form>
  );
}
