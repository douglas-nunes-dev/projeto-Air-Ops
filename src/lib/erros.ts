import { ErroAutenticacao } from '@/domain/auth/erros';
import { ErroDados } from '@/domain/erros';

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroAutenticacao) return erro.message;
  if (erro instanceof ErroDados) return erro.message;
  return 'Algo deu errado. Tente de novo em instantes.';
}
