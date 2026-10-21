import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { LayoutAutenticacao } from '@/components/auth/LayoutAutenticacao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { CredenciaisSchema, type Credenciais } from '@/domain/auth/tipos';
import { useSessao } from '@/hooks/useSessao';
import { mensagemDeErro } from '@/lib/erros';
import { entrar } from '@/services/authService';

function destinoAposEntrar(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'voltarPara' in estado) {
    const { voltarPara } = estado;
    if (typeof voltarPara === 'string' && voltarPara.startsWith('/')) return voltarPara;
  }
  return '/';
}

export function Entrar() {
  const { usuario } = useSessao();
  const navegar = useNavigate();
  const local = useLocation();
  const destino = destinoAposEntrar(local.state);

  const formulario = useForm<Credenciais>({
    resolver: zodResolver(CredenciaisSchema),
    defaultValues: { email: '', senha: '' },
  });
  const { isSubmitting, errors } = formulario.formState;

  async function enviar(dados: Credenciais) {
    try {
      await entrar(dados);
      navegar(destino, { replace: true });
    } catch (erro) {
      formulario.setError('root', { message: mensagemDeErro(erro) });
    }
  }

  if (usuario) return <Navigate to={destino} replace />;

  return (
    <LayoutAutenticacao titulo="Entrar" descricao="Acesse com seu e-mail e senha.">
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
          <CampoTexto
            control={formulario.control}
            name="senha"
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
          />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
          <Link
            to="/recuperar-senha"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </FieldGroup>
      </form>
    </LayoutAutenticacao>
  );
}
