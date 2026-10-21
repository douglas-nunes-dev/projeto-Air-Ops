import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { LayoutAutenticacao } from '@/components/auth/LayoutAutenticacao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { RecuperacaoSenhaSchema, type RecuperacaoSenha } from '@/domain/auth/tipos';
import { mensagemDeErro } from '@/lib/erros';
import { enviarRecuperacaoSenha } from '@/services/authService';

const classeLink = 'text-center text-sm text-muted-foreground underline-offset-4 hover:underline';

export function RecuperarSenha() {
  const [enviado, setEnviado] = useState(false);
  const formulario = useForm<RecuperacaoSenha>({
    resolver: zodResolver(RecuperacaoSenhaSchema),
    defaultValues: { email: '' },
  });
  const { isSubmitting, errors } = formulario.formState;

  async function enviar(dados: RecuperacaoSenha) {
    try {
      await enviarRecuperacaoSenha(dados);
      setEnviado(true);
    } catch (erro) {
      formulario.setError('root', { message: mensagemDeErro(erro) });
    }
  }

  if (enviado) {
    return (
      <LayoutAutenticacao
        titulo="Verifique seu e-mail"
        descricao="O link de recuperação foi enviado."
      >
        <FieldGroup>
          <div className="flex items-start gap-3 text-sm">
            <MailCheck className="size-5 shrink-0 text-primary" aria-hidden />
            {/* Mensagem neutra de propósito: não revela se o e-mail tem cadastro. */}
            <p>
              Se <strong>{formulario.getValues('email')}</strong> estiver cadastrado, você vai
              receber um link para criar uma nova senha. Confira também a caixa de spam.
            </p>
          </div>
          <Link to="/entrar" className={classeLink}>
            Voltar para o login
          </Link>
        </FieldGroup>
      </LayoutAutenticacao>
    );
  }

  return (
    <LayoutAutenticacao
      titulo="Recuperar senha"
      descricao="Informe seu e-mail e enviaremos um link para criar uma nova senha."
    >
      <form onSubmit={formulario.handleSubmit(enviar)} noValidate>
        <FieldGroup>
          <ErroFormulario mensagem={errors.root?.message} />
          <CampoTexto
            control={formulario.control}
            name="email"
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
          />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </Button>
          <Link to="/entrar" className={classeLink}>
            Voltar para o login
          </Link>
        </FieldGroup>
      </form>
    </LayoutAutenticacao>
  );
}
