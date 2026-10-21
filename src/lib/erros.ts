import { ErroAutenticacao } from '@/domain/auth/erros';

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroAutenticacao) return erro.message;
  return 'Algo deu errado. Tente de novo em instantes.';
}
