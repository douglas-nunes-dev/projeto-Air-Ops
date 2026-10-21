import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { aplicarErroNoFormulario } from '@/components/formulario/aplicarErro';
import { CampoAreaTexto } from '@/components/formulario/CampoAreaTexto';
import { CampoSelecao } from '@/components/formulario/CampoSelecao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import {
  ClienteFormularioSchema,
  ROTULOS_TIPO_PESSOA,
  TIPOS_PESSOA,
  type ClienteFormulario,
  type DadosCliente,
} from '@/domain/cliente/tipos';

const CAMPOS = [
  'tipoPessoa',
  'nome',
  'documento',
  'telefone',
  'email',
  'contatoNome',
  'observacoes',
];

const OPCOES_TIPO = TIPOS_PESSOA.map((tipo) => ({
  valor: tipo,
  rotulo: ROTULOS_TIPO_PESSOA[tipo],
}));

type FormularioClienteProps = {
  valoresIniciais: ClienteFormulario;
  rotuloSalvar: string;
  aoSalvar: (dados: ClienteFormulario) => Promise<void>;
  aoCancelar: () => void;
};

export function FormularioCliente({
  valoresIniciais,
  rotuloSalvar,
  aoSalvar,
  aoCancelar,
}: FormularioClienteProps) {
  const formulario = useForm<ClienteFormulario, unknown, DadosCliente>({
    resolver: zodResolver(ClienteFormularioSchema),
    defaultValues: valoresIniciais,
  });
  const { isSubmitting, errors } = formulario.formState;
  const tipoPessoa = useWatch({ control: formulario.control, name: 'tipoPessoa' });
  const ehEmpresa = tipoPessoa === 'juridica';

  async function enviar() {
    try {
      // O service valida de novo: a tela é só a primeira barreira.
      await aoSalvar(formulario.getValues());
    } catch (erro) {
      aplicarErroNoFormulario(formulario, erro, CAMPOS);
    }
  }

  return (
    <form onSubmit={formulario.handleSubmit(enviar)} noValidate>
      <Card>
        <CardContent>
          <FieldGroup>
            <ErroFormulario mensagem={errors.root?.message} />
            <div className="grid gap-6 md:grid-cols-2">
              <CampoSelecao
                control={formulario.control}
                name="tipoPessoa"
                rotulo="Tipo"
                opcoes={OPCOES_TIPO}
              />
              <CampoTexto
                control={formulario.control}
                name="documento"
                rotulo={ehEmpresa ? 'CNPJ' : 'CPF'}
                descricao="Opcional. Pode digitar com ou sem pontuação."
                inputMode="numeric"
              />
            </div>
            <CampoTexto
              control={formulario.control}
              name="nome"
              rotulo={ehEmpresa ? 'Razão social ou nome fantasia' : 'Nome completo'}
              autoComplete="off"
            />
            <div className="grid gap-6 md:grid-cols-2">
              <CampoTexto
                control={formulario.control}
                name="contatoNome"
                rotulo="Pessoa de contato"
                descricao={ehEmpresa ? 'Quem fala com você no cliente.' : undefined}
              />
              <CampoTexto
                control={formulario.control}
                name="telefone"
                rotulo="Telefone / WhatsApp"
                type="tel"
                inputMode="tel"
                placeholder="(35) 99999-9999"
              />
            </div>
            <CampoTexto
              control={formulario.control}
              name="email"
              rotulo="E-mail"
              type="email"
              inputMode="email"
            />
            <CampoAreaTexto
              control={formulario.control}
              name="observacoes"
              rotulo="Observações"
              rows={3}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={aoCancelar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : rotuloSalvar}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}
