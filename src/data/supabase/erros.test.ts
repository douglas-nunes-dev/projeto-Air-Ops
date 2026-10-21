import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { converterErroBanco } from './erros';

function erroDoBanco(code: string, message: string): PostgrestError {
  return { code, message, details: '', hint: '', name: 'PostgrestError' } as PostgrestError;
}

describe('converterErroBanco', () => {
  it('documento repetido vira mensagem no campo do formulário', () => {
    const erro = converterErroBanco(
      erroDoBanco(
        '23505',
        'duplicate key value violates unique constraint "clientes_documento_unico"',
      ),
    );
    expect(erro).toMatchObject({
      motivo: 'duplicado',
      campo: 'documento',
      message: 'Já existe um cliente com este CPF/CNPJ.',
    });
  });

  it('patrimônio repetido vira mensagem no campo do formulário', () => {
    const erro = converterErroBanco(
      erroDoBanco('23505', 'duplicate key ... "equipamentos_patrimonio_unico"'),
    );
    expect(erro).toMatchObject({ campo: 'patrimonio' });
  });

  it.each([
    ['42501', 'new row violates row-level security policy', 'sem_permissao'],
    ['PGRST116', 'JSON object requested, multiple (or no) rows returned', 'nao_encontrado'],
    ['23514', 'violates check constraint', 'dados_invalidos'],
    ['', 'TypeError: Failed to fetch', 'sem_conexao'],
    ['XX000', 'algo inesperado', 'desconhecido'],
  ])('código "%s" vira "%s"', (codigo, mensagem, motivo) => {
    expect(converterErroBanco(erroDoBanco(codigo, mensagem)).motivo).toBe(motivo);
  });
});
