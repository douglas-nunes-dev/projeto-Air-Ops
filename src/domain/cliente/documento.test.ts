import { describe, expect, it } from 'vitest';
import { cnpjValido, cpfValido, formatarDocumento } from './documento';

describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    ['dígito verificador errado', '529.982.247-26'],
    ['todos os dígitos iguais', '111.111.111-11'],
    ['tamanho errado', '5299822472'],
  ])('recusa %s', (_motivo, cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });
});

describe('CNPJ', () => {
  it.each(['11.222.333/0001-81', '11222333000181', '45.997.418/0001-53'])('aceita %s', (cnpj) => {
    expect(cnpjValido(cnpj)).toBe(true);
  });

  it.each([
    ['dígito verificador errado', '11.222.333/0001-82'],
    ['todos os dígitos iguais', '00.000.000/0000-00'],
    ['tamanho errado', '1122233300018'],
  ])('recusa %s', (_motivo, cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false);
  });
});

describe('formatarDocumento', () => {
  it('coloca a pontuação de CPF e CNPJ', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25');
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81');
  });
});
