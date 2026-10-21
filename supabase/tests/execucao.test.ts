import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { consultarComo, criarBancoDeTeste } from './bancoDeTeste.ts';
import {
  adminA,
  adminB,
  empresaA,
  empresaB,
  gestorA,
  prepararEmpresasEPessoas,
  tecnicoA,
} from './cenario.ts';

// Etapa 4: só o técnico da OS registra a execução; admin e gestor acompanham.
const clienteA = 'c0000000-0000-4000-8000-00000000000a';
const localA = 'd0000000-0000-4000-8000-00000000000a';
const outroTecnicoA = '00000000-0000-4000-8000-000000000006';
const fotoId = 'f0000000-0000-4000-8000-000000000001';

const REGISTRAR = 'select registrar_mudanca_status($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';

let banco: PGlite;
let ordemId: string;

async function abrirOrdem(tipo = 'corretiva'): Promise<string> {
  const aberta = await consultarComo(
    banco,
    adminA,
    'select abrir_ordem_servico($1, $2, $3, $4, $5, $6, $7, $8) as id',
    [empresaA, clienteA, localA, tipo, 'alta', 'Não gela', null, []],
  );
  return String(aberta.linhas[0].id);
}

/** Muda o status como a Edge Function faria (chave de serviço). */
async function mudarStatus(ordem: string, de: string, para: string) {
  const resultado = await consultarComo(banco, 'servico', REGISTRAR, [
    ordem,
    de,
    para,
    tecnicoA,
    '2026-10-22T13:00:00Z',
    60,
    para === 'cancelada' ? 'Cliente desistiu' : null,
    'mudanca_status',
    null,
    gestorA,
  ]);
  expect(resultado.erro).toBeNull();
}

async function iniciar(ordem: string) {
  await mudarStatus(ordem, 'aberta', 'agendada');
  await mudarStatus(ordem, 'agendada', 'em_execucao');
}

function caminhoDaFoto(ordem = ordemId, id = fotoId) {
  return `${empresaA}/${ordem}/${id}.jpg`;
}

function inserirFoto(usuario: string, caminho = caminhoDaFoto()) {
  return consultarComo(
    banco,
    usuario,
    `insert into anexos (id, organizacao_id, ordem_id, caminho, tamanho_bytes, tirada_em)
     values ($1, $2, $3, $4, 1000, now())`,
    [fotoId, empresaA, ordemId, caminho],
  );
}

beforeEach(async () => {
  banco = await criarBancoDeTeste();
  await prepararEmpresasEPessoas(banco);
  await banco.query('insert into auth.users (id, email) values ($1, $2)', [
    outroTecnicoA,
    'outro@teste.com',
  ]);
  await banco.query(
    "insert into organizacao_usuarios (organizacao_id, usuario_id, papeis) values ($1, $2, '{tecnico}')",
    [empresaA, outroTecnicoA],
  );
  await banco.query(
    "insert into clientes (id, organizacao_id, nome) values ($1, $2, 'Hospital A')",
    [clienteA, empresaA],
  );
  await banco.query(
    "insert into locais_atendimento (id, organizacao_id, cliente_id, nome) values ($1, $2, $3, 'UTI')",
    [localA, empresaA, clienteA],
  );
  ordemId = await abrirOrdem();
});

describe('modelos de checklist', () => {
  it('cada empresa nasce com os modelos padrão de preventiva, corretiva e instalação', async () => {
    const modelos = await consultarComo(
      banco,
      adminA,
      'select tipo_servico, cardinality(itens) as itens from checklist_modelos order by tipo_servico',
    );
    expect(modelos.linhas).toEqual([
      { tipo_servico: 'corretiva', itens: 5 },
      { tipo_servico: 'preventiva', itens: 12 },
      { tipo_servico: 'instalacao', itens: 9 },
    ]);
  });

  it('empresa criada depois também recebe os modelos; ninguém vê os de outra empresa', async () => {
    const nova = 'cccccccc-0000-4000-8000-000000000000';
    await banco.query("insert into organizacoes (id, nome) values ($1, 'Nova')", [nova]);
    const daNova = await banco.query('select 1 from checklist_modelos where organizacao_id = $1', [
      nova,
    ]);
    expect(daNova.rows).toHaveLength(3);

    const vistosPorB = await consultarComo(
      banco,
      adminB,
      'select distinct organizacao_id from checklist_modelos',
    );
    expect(vistosPorB.linhas).toEqual([{ organizacao_id: empresaB }]);
  });

  it('só o admin altera os modelos', async () => {
    const sql = "update checklist_modelos set nome = 'Meu modelo' where tipo_servico = 'corretiva'";
    expect((await consultarComo(banco, gestorA, sql)).afetadas).toBe(0);
    expect((await consultarComo(banco, tecnicoA, sql)).afetadas).toBe(0);
    expect((await consultarComo(banco, adminA, sql)).afetadas).toBe(1);
  });
});

describe('checklist da OS', () => {
  const PREPARAR = 'select preparar_checklist($1)';

  it('o técnico prepara durante a execução: copia os itens do modelo, uma vez só', async () => {
    await iniciar(ordemId);

    expect((await consultarComo(banco, tecnicoA, PREPARAR, [ordemId])).erro).toBeNull();
    expect((await consultarComo(banco, tecnicoA, PREPARAR, [ordemId])).erro).toBeNull();

    const itens = await consultarComo(
      banco,
      gestorA,
      'select posicao, item, resposta from checklist_respostas where ordem_id = $1 order by posicao',
      [ordemId],
    );
    expect(itens.linhas).toHaveLength(5);
    expect(itens.linhas[0]).toEqual({
      posicao: 1,
      item: 'Defeito relatado confirmado no local',
      resposta: null,
    });
  });

  it('mudar o modelo depois não altera o checklist já copiado', async () => {
    await iniciar(ordemId);
    await consultarComo(banco, tecnicoA, PREPARAR, [ordemId]);
    await consultarComo(
      banco,
      adminA,
      "update checklist_modelos set itens = '{Item novo}' where tipo_servico = 'corretiva'",
    );
    const itens = await banco.query('select 1 from checklist_respostas where ordem_id = $1', [
      ordemId,
    ]);
    expect(itens.rows).toHaveLength(5);
  });

  it('gestor, outro técnico e OS fora de execução não preparam', async () => {
    await mudarStatus(ordemId, 'aberta', 'agendada');
    const antesDeIniciar = await consultarComo(banco, tecnicoA, PREPARAR, [ordemId]);
    expect(antesDeIniciar.erro).toMatch(/Só o técnico da OS/);

    await mudarStatus(ordemId, 'agendada', 'em_execucao');
    for (const usuario of [gestorA, adminA, outroTecnicoA, adminB]) {
      const resultado = await consultarComo(banco, usuario, PREPARAR, [ordemId]);
      expect(resultado.erro, usuario).toMatch(/Só o técnico da OS/);
    }
  });

  it('o técnico responde; quem e quando respondeu vêm do banco', async () => {
    await iniciar(ordemId);
    await consultarComo(banco, tecnicoA, PREPARAR, [ordemId]);

    const resposta = await consultarComo(
      banco,
      tecnicoA,
      `update checklist_respostas set resposta = 'nao_conforme', observacao = 'Dreno entupido'
       where ordem_id = $1 and posicao = 1`,
      [ordemId],
    );
    expect(resposta.afetadas).toBe(1);

    const linha = await banco.query<Record<string, unknown>>(
      'select resposta, respondido_por, respondido_em is not null as tem_data from checklist_respostas where posicao = 1',
    );
    expect(linha.rows[0]).toEqual({
      resposta: 'nao_conforme',
      respondido_por: tecnicoA,
      tem_data: true,
    });
  });

  it('gestor não responde, ninguém cria itens à mão e, pausada, o checklist trava', async () => {
    await iniciar(ordemId);
    await consultarComo(banco, tecnicoA, PREPARAR, [ordemId]);
    const responder = `update checklist_respostas set resposta = 'ok' where ordem_id = $1`;

    expect((await consultarComo(banco, gestorA, responder, [ordemId])).afetadas).toBe(0);

    const criar = await consultarComo(
      banco,
      tecnicoA,
      "insert into checklist_respostas (organizacao_id, ordem_id, posicao, item) values ($1, $2, 99, 'Extra')",
      [empresaA, ordemId],
    );
    expect(criar.erro).toMatch(/permission denied/);

    await mudarStatus(ordemId, 'em_execucao', 'pausada');
    expect((await consultarComo(banco, tecnicoA, responder, [ordemId])).afetadas).toBe(0);
  });
});

describe('anotações e atividades', () => {
  const SALVAR_ANOTACOES = `insert into ordem_servico_execucao (ordem_id, organizacao_id, diagnostico)
     values ($1, $2, 'Capacitor queimado')`;
  const NOVA_ATIVIDADE = `insert into ordem_servico_itens (organizacao_id, ordem_id, descricao)
     values ($1, $2, 'Troca do capacitor')`;

  it('o técnico grava diagnóstico e atividades; o gestor lê', async () => {
    await iniciar(ordemId);
    expect(
      (await consultarComo(banco, tecnicoA, SALVAR_ANOTACOES, [ordemId, empresaA])).erro,
    ).toBeNull();
    expect(
      (await consultarComo(banco, tecnicoA, NOVA_ATIVIDADE, [empresaA, ordemId])).erro,
    ).toBeNull();

    const anotacoes = await consultarComo(
      banco,
      gestorA,
      'select diagnostico, atualizado_por from ordem_servico_execucao',
    );
    expect(anotacoes.linhas).toEqual([
      { diagnostico: 'Capacitor queimado', atualizado_por: tecnicoA },
    ]);
    const atividades = await consultarComo(
      banco,
      gestorA,
      'select descricao, criado_por from ordem_servico_itens',
    );
    expect(atividades.linhas).toEqual([{ descricao: 'Troca do capacitor', criado_por: tecnicoA }]);
  });

  it('salvar_anotacoes_execucao: cria na primeira vez e atualiza depois (como o app faz)', async () => {
    const SALVAR = 'select salvar_anotacoes_execucao($1, $2, $3)';
    await iniciar(ordemId);

    const primeira = await consultarComo(banco, tecnicoA, SALVAR, [ordemId, 'Capacitor', null]);
    expect(primeira.erro).toBeNull();
    const segunda = await consultarComo(banco, tecnicoA, SALVAR, [
      ordemId,
      'Capacitor queimado',
      '1 capacitor 35µF',
    ]);
    expect(segunda.erro).toBeNull();

    const linhas = await banco.query<Record<string, unknown>>(
      'select organizacao_id, diagnostico, materiais from ordem_servico_execucao',
    );
    expect(linhas.rows).toEqual([
      {
        organizacao_id: empresaA,
        diagnostico: 'Capacitor queimado',
        materiais: '1 capacitor 35µF',
      },
    ]);

    for (const usuario of [gestorA, outroTecnicoA, adminB]) {
      const recusa = await consultarComo(banco, usuario, SALVAR, [ordemId, 'x', null]);
      expect(recusa.erro, usuario).toMatch(/row-level security|OS não encontrada/);
    }
    await mudarStatus(ordemId, 'em_execucao', 'pausada');
    const pausada = await consultarComo(banco, tecnicoA, SALVAR, [ordemId, 'x', null]);
    expect(pausada.erro).toMatch(/row-level security/);
  });

  it('o "upsert" direto pela tabela (jeito antigo do app) é recusado', async () => {
    await iniciar(ordemId);
    await consultarComo(banco, tecnicoA, SALVAR_ANOTACOES, [ordemId, empresaA]);
    const upsert = await consultarComo(
      banco,
      tecnicoA,
      `insert into ordem_servico_execucao (ordem_id, organizacao_id, diagnostico) values ($1, $2, 'y')
       on conflict (ordem_id) do update set ordem_id = excluded.ordem_id,
         organizacao_id = excluded.organizacao_id, diagnostico = excluded.diagnostico`,
      [ordemId, empresaA],
    );
    expect(upsert.erro).toMatch(/permission denied/);
  });

  it('gestor, outro técnico e outra empresa não gravam nem enxergam', async () => {
    await iniciar(ordemId);
    for (const usuario of [gestorA, adminA, outroTecnicoA, adminB]) {
      const anotacoes = await consultarComo(banco, usuario, SALVAR_ANOTACOES, [ordemId, empresaA]);
      expect(anotacoes.erro, usuario).toMatch(/row-level security/);
      const atividade = await consultarComo(banco, usuario, NOVA_ATIVIDADE, [empresaA, ordemId]);
      expect(atividade.erro, usuario).toMatch(/row-level security/);
    }

    await consultarComo(banco, tecnicoA, NOVA_ATIVIDADE, [empresaA, ordemId]);
    for (const usuario of [outroTecnicoA, adminB]) {
      const vistas = await consultarComo(banco, usuario, 'select 1 from ordem_servico_itens');
      expect(vistas.linhas, usuario).toEqual([]);
    }
  });

  it('com a OS agendada (ainda não iniciada), o técnico não grava', async () => {
    await mudarStatus(ordemId, 'aberta', 'agendada');
    const resultado = await consultarComo(banco, tecnicoA, NOVA_ATIVIDADE, [empresaA, ordemId]);
    expect(resultado.erro).toMatch(/row-level security/);
  });

  it('o técnico apaga só as próprias atividades, e só durante a execução', async () => {
    await iniciar(ordemId);
    await consultarComo(banco, tecnicoA, NOVA_ATIVIDADE, [empresaA, ordemId]);
    const apagar = 'delete from ordem_servico_itens where ordem_id = $1';

    expect((await consultarComo(banco, gestorA, apagar, [ordemId])).afetadas).toBe(0);
    await mudarStatus(ordemId, 'em_execucao', 'pausada');
    expect((await consultarComo(banco, tecnicoA, apagar, [ordemId])).afetadas).toBe(0);
    await mudarStatus(ordemId, 'pausada', 'em_execucao');
    expect((await consultarComo(banco, tecnicoA, apagar, [ordemId])).afetadas).toBe(1);
  });
});

describe('fotos', () => {
  const ENVIAR_ARQUIVO = "insert into storage.objects (bucket_id, name) values ('anexos', $1)";

  it('o técnico registra a foto em execução e também com a OS pausada', async () => {
    await iniciar(ordemId);
    expect((await inserirFoto(tecnicoA)).erro).toBeNull();

    await mudarStatus(ordemId, 'em_execucao', 'pausada');
    const segunda = await consultarComo(
      banco,
      tecnicoA,
      `insert into anexos (id, organizacao_id, ordem_id, caminho, tamanho_bytes, tirada_em)
       values ($1, $2, $3, $4, 500, now())`,
      [
        'f0000000-0000-4000-8000-000000000002',
        empresaA,
        ordemId,
        caminhoDaFoto(ordemId, 'f0000000-0000-4000-8000-000000000002'),
      ],
    );
    expect(segunda.erro).toBeNull();
  });

  it('o caminho precisa ser "empresa/OS/id.jpg"', async () => {
    await iniciar(ordemId);
    const resultado = await inserirFoto(tecnicoA, `${empresaA}/${ordemId}/outro-nome.jpg`);
    expect(resultado.erro).toMatch(/anexos_caminho_padrao/);
  });

  it('gestor e outro técnico não registram fotos; OS cancelada não aceita fotos', async () => {
    await iniciar(ordemId);
    for (const usuario of [gestorA, outroTecnicoA, adminB]) {
      expect((await inserirFoto(usuario)).erro, usuario).toMatch(/row-level security/);
    }
    await mudarStatus(ordemId, 'em_execucao', 'cancelada');
    expect((await inserirFoto(tecnicoA)).erro).toMatch(/row-level security/);
  });

  it('Storage: o técnico envia o arquivo só para a pasta da OS que está executando', async () => {
    await iniciar(ordemId);
    const certo = await consultarComo(banco, tecnicoA, ENVIAR_ARQUIVO, [caminhoDaFoto()]);
    expect(certo.erro).toBeNull();

    const outraOrdem = await abrirOrdem();
    const errado = await consultarComo(banco, tecnicoA, ENVIAR_ARQUIVO, [
      caminhoDaFoto(outraOrdem),
    ]);
    expect(errado.erro).toMatch(/row-level security/);

    const foraDoPadrao = await consultarComo(banco, tecnicoA, ENVIAR_ARQUIVO, [
      `${empresaA}/${ordemId}/../segredo.jpg`,
    ]);
    expect(foraDoPadrao.erro).toMatch(/row-level security/);

    const gestor = await consultarComo(banco, gestorA, ENVIAR_ARQUIVO, [
      caminhoDaFoto(ordemId, 'f0000000-0000-4000-8000-000000000009'),
    ]);
    expect(gestor.erro).toMatch(/row-level security/);
  });

  it('Storage: quem lê a OS vê as fotos; outro técnico e outra empresa não', async () => {
    await iniciar(ordemId);
    await consultarComo(banco, tecnicoA, ENVIAR_ARQUIVO, [caminhoDaFoto()]);
    const ver = "select name from storage.objects where bucket_id = 'anexos'";

    for (const usuario of [tecnicoA, gestorA, adminA]) {
      expect((await consultarComo(banco, usuario, ver)).linhas, usuario).toHaveLength(1);
    }
    for (const usuario of [outroTecnicoA, adminB, null]) {
      expect((await consultarComo(banco, usuario, ver)).linhas, String(usuario)).toEqual([]);
    }
  });
});
