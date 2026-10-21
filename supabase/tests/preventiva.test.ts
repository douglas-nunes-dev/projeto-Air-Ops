import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste } from './bancoDeTeste.ts';
import { adminA, empresaA, empresaB, prepararEmpresasEPessoas, tecnicoA } from './cenario.ts';

// Etapa 8: ao concluir uma preventiva, a Edge Function manda as novas datas de próxima
// manutenção e o banco grava junto com a conclusão — só nos equipamentos da OS.
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const clienteB = 'c0000000-0000-4000-8000-00000000000b';
const localB = 'd0000000-0000-4000-8000-00000000000b';
const naOrdem = 'e0000000-0000-4000-8000-000000000001';
const foraDaOrdem = 'e0000000-0000-4000-8000-000000000002';
const deOutraEmpresa = 'e0000000-0000-4000-8000-000000000003';

const CONCLUIR = 'select registrar_conclusao($1, $2, $3, $4, $5, $6, $7)';

let banco: PGlite;
let ordemId: string;

async function proxima(equipamento: string) {
  const resultado = await banco.query<{ proxima: string | null }>(
    "select to_char(proxima_manutencao, 'YYYY-MM-DD') as proxima from equipamentos where id = $1",
    [equipamento],
  );
  return resultado.rows[0].proxima;
}

function concluir(proximas: unknown[]) {
  return consultarComo(banco, 'servico', CONCLUIR, [
    ordemId,
    tecnicoA,
    null,
    null,
    'Responsável ausente',
    'Concluída sem assinatura',
    JSON.stringify(proximas),
  ]);
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
  await prepararEmpresasEPessoas(banco);
  await banco.query(
    "insert into clientes (id, organizacao_id, nome) values ($1, $2, 'Hospital A'), ($3, $4, 'Cliente B')",
    [clienteA, empresaA, clienteB, empresaB],
  );
  await banco.query(
    "insert into locais_atendimento (id, organizacao_id, cliente_id, nome) values ($1, $2, $3, 'UTI'), ($4, $5, $6, 'Sala B')",
    [localA, empresaA, clienteA, localB, empresaB, clienteB],
  );
  await banco.query(
    `insert into equipamentos (id, organizacao_id, local_id, identificacao, tipo, periodicidade_dias)
     values ($1, $4, $5, 'Split 1', 'split', 30), ($2, $4, $5, 'Split 2', 'split', 30),
            ($3, $6, $7, 'Split B', 'split', 30)`,
    [naOrdem, foraDaOrdem, deOutraEmpresa, empresaA, localA, empresaB, localB],
  );
  const aberta = await consultarComo(
    banco,
    adminA,
    'select abrir_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8) as id',
    [empresaA, clienteA, localA, 'preventiva', 'media', 'Preventiva mensal', null, [naOrdem]],
  );
  ordemId = String(aberta.linhas[0].id);
  for (const [de, para] of [
    ['aberta', 'agendada'],
    ['agendada', 'em_execucao'],
  ]) {
    await consultarComo(
      banco,
      'servico',
      'select registrar_mudanca_status($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [
        ordemId,
        de,
        para,
        tecnicoA,
        '2026-10-24T13:00:00Z',
        60,
        null,
        'mudanca_status',
        null,
        tecnicoA,
      ],
    );
  }
});

describe('registrar_conclusao com próxima manutenção', () => {
  it('grava a nova data no equipamento da OS, junto com a conclusão', async () => {
    const resultado = await concluir([
      { equipamento_id: naOrdem, proxima_manutencao: '2026-11-23' },
    ]);
    expect(resultado.erro).toBeNull();
    expect(await proxima(naOrdem)).toBe('2026-11-23');
  });

  it('ignora datas para equipamento fora da OS ou de outra empresa', async () => {
    await concluir([
      { equipamento_id: naOrdem, proxima_manutencao: '2026-11-23' },
      { equipamento_id: foraDaOrdem, proxima_manutencao: '2030-01-01' },
      { equipamento_id: deOutraEmpresa, proxima_manutencao: '2030-01-01' },
    ]);
    expect(await proxima(foraDaOrdem)).toBeNull();
    expect(await proxima(deOutraEmpresa)).toBeNull();
  });

  it('se a conclusão falhar, a data também não muda (mesma transação)', async () => {
    // Sem assinatura e sem motivo: a constraint da assinatura recusa a conclusão inteira.
    const resultado = await consultarComo(banco, 'servico', CONCLUIR, [
      ordemId,
      tecnicoA,
      null,
      null,
      null,
      'x',
      JSON.stringify([{ equipamento_id: naOrdem, proxima_manutencao: '2026-11-23' }]),
    ]);
    expect(resultado.erro).toMatch(/assinaturas_completa/);
    expect(await proxima(naOrdem)).toBeNull();
  });

  it('o app altera a próxima manutenção à mão (ajuste do gestor); a conclusão, não', async () => {
    const ajuste = await consultarComo(
      banco,
      adminA,
      "update equipamentos set proxima_manutencao = '2026-12-01' where id = $1",
      [naOrdem],
    );
    expect(ajuste.afetadas).toBe(1);
    const direto = await consultarComo(banco, tecnicoA, CONCLUIR, [
      ordemId,
      tecnicoA,
      null,
      null,
      'x',
      'x',
      '[]',
    ]);
    expect(direto.erro).toMatch(/permission denied/);
  });
});
