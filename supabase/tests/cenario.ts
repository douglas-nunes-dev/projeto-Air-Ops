import type { PGlite } from '@electric-sql/pglite';
import type { ResultadoConsulta } from './bancoDeTeste.ts';

// Cenário usado em todos os testes de acesso: duas empresas e uma pessoa por papel.
export const empresaA = 'aaaaaaaa-0000-4000-8000-000000000000';
export const empresaB = 'bbbbbbbb-0000-4000-8000-000000000000';

export const adminA = '00000000-0000-4000-8000-000000000001';
export const gestorA = '00000000-0000-4000-8000-000000000002';
export const tecnicoA = '00000000-0000-4000-8000-000000000003';
export const desativadoA = '00000000-0000-4000-8000-000000000004';
export const adminB = '00000000-0000-4000-8000-000000000005';

export async function prepararEmpresasEPessoas(banco: PGlite): Promise<void> {
  const pessoas: [string, string][] = [
    [adminA, 'Admin A'],
    [gestorA, 'Gestor A'],
    [tecnicoA, 'Técnico A'],
    [desativadoA, 'Desativado A'],
    [adminB, 'Admin B'],
  ];
  for (const [id, nome] of pessoas) {
    await banco.query(
      'insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)',
      [id, `${id}@teste.com`, { nome }],
    );
  }

  await banco.query('insert into organizacoes (id, nome) values ($1, $2), ($3, $4)', [
    empresaA,
    'Empresa A',
    empresaB,
    'Empresa B',
  ]);

  const vinculos: [string, string, string, boolean][] = [
    [empresaA, adminA, '{admin}', true],
    [empresaA, gestorA, '{gestor}', true],
    [empresaA, tecnicoA, '{tecnico}', true],
    [empresaA, desativadoA, '{admin,gestor,tecnico}', false],
    [empresaB, adminB, '{admin}', true],
  ];
  for (const vinculo of vinculos) {
    await banco.query(
      'insert into organizacao_usuarios (organizacao_id, usuario_id, papeis, ativo) values ($1, $2, $3, $4)',
      vinculo,
    );
  }
}

export function nomes(resultado: ResultadoConsulta, coluna = 'nome'): string[] {
  return resultado.linhas.map((linha) => String(linha[coluna])).sort();
}
