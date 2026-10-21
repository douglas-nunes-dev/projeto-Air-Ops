import { z } from 'zod';

export const TAMANHO_MINIMO_SENHA = 8;

export type UsuarioLogado = {
  id: string;
  email: string;
};

export const CredenciaisSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail').email('Informe um e-mail válido'),
  senha: z.string().min(1, 'Informe a senha'),
});

export type Credenciais = z.infer<typeof CredenciaisSchema>;

export const RecuperacaoSenhaSchema = CredenciaisSchema.pick({ email: true });

export type RecuperacaoSenha = z.infer<typeof RecuperacaoSenhaSchema>;

export const NovaSenhaSchema = z
  .object({
    senha: z
      .string()
      .min(
        TAMANHO_MINIMO_SENHA,
        `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`,
      ),
    confirmacao: z.string().min(1, 'Repita a nova senha'),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: 'As senhas não são iguais',
    path: ['confirmacao'],
  });

export type NovaSenha = z.infer<typeof NovaSenhaSchema>;
