import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { LayoutAutenticacao } from '@/components/auth/LayoutAutenticacao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { TelaCarregando } from '@/components/TelaCarregando';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { NovaSenhaSchema, TAMANHO_MINIMO_SENHA, type NovaSenha } from '@/domain/auth/tipos';
import { useSessao } from '@/hooks/useSessao';
import { mensagemDeErro } from '@/lib/erros';
import { redefinirSenha } from '@/services/authService';

export function RedefinirSenha() {
  const { usuario, carregando } = useSessao();
  const navegar = useNavigate();
  const formulario = useForm<NovaSenha>({
    resolver: zodResolver(NovaSenhaSchema),
    defaultValues: { senha: '', confirmacao: '' },
  });
  const { isSubmitting, errors } = formulario.formState;

  async function enviar(dados: NovaSenha) {
    try {
      await redefinirSenha(dados);
      toast.success('Senha alterada com sucesso.');
      navegar('/', { replace: true });
    } catch (erro) {
      formulario.setError('root', { message: mensagemDeErro(erro) });
    }
  }

  if (carregando) return <TelaCarregando />;

  // O link do e-mail cria uma sessão temporária; sem ela, o link é inválido ou já expirou.
  if (!usuario) {
    return (
      <LayoutAutenticacao
        titulo="Link inválido ou expirado"
        descricao="Peça um novo link para criar sua senha."
      >
        <Button asChild size="lg" className="w-full">
          <Link to="/recuperar-senha">Pedir novo link</Link>
        </Button>
      </LayoutAutenticacao>
    );
  }

  return (
    <LayoutAutenticacao titulo="Criar nova senha" descricao={`Conta: ${usuario.email}`}>
      <form onSubmit={formulario.handleSubmit(enviar)} noValidate>
        <FieldGroup>
          <ErroFormulario mensagem={errors.root?.message} />
          <CampoTexto
            control={formulario.control}
            name="senha"
            rotulo="Nova senha"
            descricao={`Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres.`}
            type="password"
            autoComplete="new-password"
          />
          <CampoTexto
            control={formulario.control}
            name="confirmacao"
            rotulo="Repita a nova senha"
            type="password"
            autoComplete="new-password"
          />
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </FieldGroup>
      </form>
    </LayoutAutenticacao>
  );
}
