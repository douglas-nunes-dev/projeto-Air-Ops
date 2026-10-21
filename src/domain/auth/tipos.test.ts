import { describe, expect, it } from 'vitest';
import { CredenciaisSchema, NovaSenhaSchema } from './tipos';

describe('CredenciaisSchema', () => {
  it('aceita e-mail válido e remove espaços nas pontas', () => {
    const dados = CredenciaisSchema.parse({ email: '  joao@airops.com.br ', senha: 'x' });
    expect(dados.email).toBe('joao@airops.com.br');
  });

  it('recusa e-mail inválido e senha vazia', () => {
    const resultado = CredenciaisSchema.safeParse({ email: 'joao', senha: '' });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues.map((i) => i.message)).toEqual([
      'Informe um e-mail válido',
      'Informe a senha',
    ]);
  });
});

describe('NovaSenhaSchema', () => {
  it('exige pelo menos 8 caracteres', () => {
    const resultado = NovaSenhaSchema.safeParse({ senha: '1234567', confirmacao: '1234567' });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe('A senha precisa ter pelo menos 8 caracteres');
  });

  it('exige que a confirmação seja igual', () => {
    const resultado = NovaSenhaSchema.safeParse({ senha: '12345678', confirmacao: '12345679' });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['confirmacao']);
  });

  it('aceita senha válida e confirmada', () => {
    expect(NovaSenhaSchema.safeParse({ senha: '12345678', confirmacao: '12345678' }).success).toBe(
      true,
    );
  });
});
