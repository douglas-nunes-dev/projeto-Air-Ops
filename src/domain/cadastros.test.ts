import { describe, expect, it } from 'vitest';
import { LOCAL_FORMULARIO_VAZIO, LocalFormularioSchema, resumirEndereco } from './cliente/local';
import { CLIENTE_FORMULARIO_VAZIO, ClienteFormularioSchema } from './cliente/tipos';
import {
  EQUIPAMENTO_FORMULARIO_VAZIO,
  EquipamentoFormularioSchema,
  rotuloPeriodicidade,
} from './equipamento/tipos';

describe('formulário de cliente', () => {
  it('normaliza: tira pontuação de documento e telefone e troca vazio por null', () => {
    const dados = ClienteFormularioSchema.parse({
      ...CLIENTE_FORMULARIO_VAZIO,
      nome: '  Hospital São Lucas  ',
      documento: '11.222.333/0001-81',
      telefone: '(35) 99999-8888',
    });

    expect(dados).toEqual({
      tipoPessoa: 'juridica',
      nome: 'Hospital São Lucas',
      documento: '11222333000181',
      telefone: '35999998888',
      email: null,
      contatoNome: null,
      observacoes: null,
    });
  });

  it('confere o documento conforme o tipo: CNPJ para empresa, CPF para pessoa física', () => {
    const cpfNaEmpresa = ClienteFormularioSchema.safeParse({
      ...CLIENTE_FORMULARIO_VAZIO,
      nome: 'Empresa',
      documento: '529.982.247-25',
    });
    expect(cpfNaEmpresa.error?.issues[0]).toMatchObject({
      path: ['documento'],
      message: 'CNPJ inválido',
    });

    const cpfNaPessoa = ClienteFormularioSchema.safeParse({
      ...CLIENTE_FORMULARIO_VAZIO,
      tipoPessoa: 'fisica',
      nome: 'João da Silva',
      documento: '529.982.247-25',
    });
    expect(cpfNaPessoa.success).toBe(true);
  });

  it('exige nome e recusa e-mail e telefone inválidos', () => {
    const resultado = ClienteFormularioSchema.safeParse({
      ...CLIENTE_FORMULARIO_VAZIO,
      email: 'sem-arroba',
      telefone: '9999',
    });
    const campos = resultado.error?.issues.map((problema) => problema.path[0]);
    expect(campos).toEqual(expect.arrayContaining(['nome', 'email', 'telefone']));
  });
});

describe('formulário de local', () => {
  it('aceita só o nome e recusa CEP e UF inválidos', () => {
    expect(
      LocalFormularioSchema.safeParse({ ...LOCAL_FORMULARIO_VAZIO, nome: 'Matriz' }).success,
    ).toBe(true);
    const invalido = LocalFormularioSchema.safeParse({
      ...LOCAL_FORMULARIO_VAZIO,
      nome: 'Matriz',
      cep: '379',
      uf: 'XX',
    });
    expect(invalido.error?.issues.map((problema) => problema.path[0])).toEqual(['cep', 'uf']);
  });

  it('resume o endereço numa linha', () => {
    const dados = LocalFormularioSchema.parse({
      ...LOCAL_FORMULARIO_VAZIO,
      nome: 'Matriz',
      logradouro: 'Rua Dr. Manoel Patti',
      numero: '1000',
      bairro: 'Centro',
      cidade: 'Passos',
      uf: 'MG',
    });
    const local = { ...dados, id: '1', organizacaoId: '1', clienteId: '1', ativo: true };
    expect(resumirEndereco(local)).toBe('Rua Dr. Manoel Patti, 1000 — Centro — Passos/MG');
  });
});

describe('formulário de equipamento', () => {
  const localId = 'bbbbbbbb-0000-4000-8000-000000000001';

  it('converte capacidade e periodicidade para número', () => {
    const dados = EquipamentoFormularioSchema.parse({
      ...EQUIPAMENTO_FORMULARIO_VAZIO,
      localId,
      identificacao: 'Split Sala 2',
      capacidadeBtu: '12.000',
      periodicidadeDias: '90',
    });
    expect(dados).toMatchObject({ capacidadeBtu: 12000, periodicidadeDias: 90, marca: null });
  });

  it('exige local e identificação', () => {
    const resultado = EquipamentoFormularioSchema.safeParse(EQUIPAMENTO_FORMULARIO_VAZIO);
    expect(resultado.error?.issues.map((problema) => problema.message)).toEqual([
      'Escolha o local',
      'Informe a identificação',
    ]);
  });

  it('dá nome às periodicidades comuns', () => {
    expect(rotuloPeriodicidade(30)).toBe('Mensal');
    expect(rotuloPeriodicidade(45)).toBe('A cada 45 dias');
    expect(rotuloPeriodicidade(null)).toBe('Sem preventiva');
  });
});
