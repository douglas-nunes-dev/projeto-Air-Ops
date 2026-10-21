import { somenteDigitos } from '@/domain/comum/campos';

// Validação de CPF e CNPJ pelos dígitos verificadores (regra da Receita Federal).

function todosIguais(digitos: string): boolean {
  return /^(\d)\1+$/.test(digitos);
}

function digitoVerificador(digitos: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, indice) => total + Number(digitos[indice]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(cpf: string): boolean {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11 || todosIguais(digitos)) return false;

  const primeiro = digitoVerificador(digitos, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digitoVerificador(digitos, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === Number(digitos[9]) && segundo === Number(digitos[10]);
}

export function cnpjValido(cnpj: string): boolean {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14 || todosIguais(digitos)) return false;

  const primeiro = digitoVerificador(digitos, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digitoVerificador(digitos, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return primeiro === Number(digitos[12]) && segundo === Number(digitos[13]);
}

export function formatarDocumento(documento: string): string {
  const d = somenteDigitos(documento);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return documento;
}
