import { authProvider } from '@/data';
import type { OuvinteSessao } from '@/data/repositories/AuthProvider';
import {
  CredenciaisSchema,
  NovaSenhaSchema,
  RecuperacaoSenhaSchema,
  type Credenciais,
  type NovaSenha,
  type RecuperacaoSenha,
  type UsuarioLogado,
} from '@/domain/auth/tipos';
import { limparFotosDoAparelho } from './storageService';

export const ROTA_REDEFINIR_SENHA = '/redefinir-senha';

export async function entrar(dados: Credenciais): Promise<UsuarioLogado> {
  const { email, senha } = CredenciaisSchema.parse(dados);
  return authProvider.entrar(email, senha);
}

export async function sair(): Promise<void> {
  await authProvider.sair();
  // Fotos de clientes não ficam no aparelho depois que a pessoa sai (seção 11).
  await limparFotosDoAparelho().catch(() => undefined);
}

export async function usuarioAtual(): Promise<UsuarioLogado | null> {
  return authProvider.usuarioAtual();
}

export async function enviarRecuperacaoSenha(dados: RecuperacaoSenha): Promise<void> {
  const { email } = RecuperacaoSenhaSchema.parse(dados);
  // O link do e-mail precisa voltar para este mesmo endereço (local, homologação ou produção).
  const urlRetorno = `${window.location.origin}${ROTA_REDEFINIR_SENHA}`;
  await authProvider.enviarRecuperacaoSenha(email, urlRetorno);
}

export async function redefinirSenha(dados: NovaSenha): Promise<void> {
  const { senha } = NovaSenhaSchema.parse(dados);
  await authProvider.redefinirSenha(senha);
}

export function observarSessao(ouvinte: OuvinteSessao): () => void {
  return authProvider.observarSessao(ouvinte);
}

export type { EventoSessao } from '@/data/repositories/AuthProvider';
