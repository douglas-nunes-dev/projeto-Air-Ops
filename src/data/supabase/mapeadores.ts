import type { DadosLocal, LocalAtendimento } from '@/domain/cliente/local';
import type { Cliente, DadosCliente } from '@/domain/cliente/tipos';
import type { DadosEquipamento, Equipamento } from '@/domain/equipamento/tipos';
import type { DadosOrdem, EventoOrdem, Ordem } from '@/domain/ordem/tipos';
import type { Papel } from '@/domain/organizacao/tipos';
import type { Database, Tables, TablesInsert } from './tipos-banco';

// Conversão entre as linhas do banco (snake_case) e os tipos do domínio (camelCase).
// Os tipos gerados pelo Supabase não saem desta pasta (regra 4 da seção 7).

export function mapearCliente(linha: Tables<'clientes'>): Cliente {
  return {
    id: linha.id,
    organizacaoId: linha.organizacao_id,
    tipoPessoa: linha.tipo_pessoa,
    nome: linha.nome,
    documento: linha.documento,
    telefone: linha.telefone,
    email: linha.email,
    contatoNome: linha.contato_nome,
    observacoes: linha.observacoes,
    ativo: linha.ativo,
  };
}

export function linhaCliente(dados: DadosCliente) {
  return {
    tipo_pessoa: dados.tipoPessoa,
    nome: dados.nome,
    documento: dados.documento,
    telefone: dados.telefone,
    email: dados.email,
    contato_nome: dados.contatoNome,
    observacoes: dados.observacoes,
  } satisfies Partial<TablesInsert<'clientes'>>;
}

export function mapearLocal(linha: Tables<'locais_atendimento'>): LocalAtendimento {
  return {
    id: linha.id,
    organizacaoId: linha.organizacao_id,
    clienteId: linha.cliente_id,
    nome: linha.nome,
    cep: linha.cep,
    logradouro: linha.logradouro,
    numero: linha.numero,
    complemento: linha.complemento,
    bairro: linha.bairro,
    cidade: linha.cidade,
    uf: linha.uf,
    observacoes: linha.observacoes,
    ativo: linha.ativo,
  };
}

export function linhaLocal(dados: DadosLocal) {
  return {
    nome: dados.nome,
    cep: dados.cep,
    logradouro: dados.logradouro,
    numero: dados.numero,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidade: dados.cidade,
    uf: dados.uf,
    observacoes: dados.observacoes,
  } satisfies Partial<TablesInsert<'locais_atendimento'>>;
}

/** Colunas pedidas ao listar equipamentos: inclui o nome do local e do cliente. */
export const COLUNAS_EQUIPAMENTO =
  '*, local:locais_atendimento!inner(nome, cliente_id, cliente:clientes!inner(nome))';

export type LinhaEquipamento = Tables<'equipamentos'> & {
  local: { nome: string; cliente_id: string; cliente: { nome: string } };
};

export function mapearEquipamento(linha: LinhaEquipamento): Equipamento {
  return {
    id: linha.id,
    organizacaoId: linha.organizacao_id,
    localId: linha.local_id,
    identificacao: linha.identificacao,
    tipo: linha.tipo,
    marca: linha.marca,
    modelo: linha.modelo,
    capacidadeBtu: linha.capacidade_btu,
    numeroSerie: linha.numero_serie,
    patrimonio: linha.patrimonio,
    dataInstalacao: linha.data_instalacao,
    periodicidadeDias: linha.periodicidade_dias,
    proximaManutencao: linha.proxima_manutencao,
    observacoes: linha.observacoes,
    ativo: linha.ativo,
    localNome: linha.local.nome,
    clienteId: linha.local.cliente_id,
    clienteNome: linha.local.cliente.nome,
  };
}

export function linhaEquipamento(dados: DadosEquipamento) {
  return {
    local_id: dados.localId,
    identificacao: dados.identificacao,
    tipo: dados.tipo,
    marca: dados.marca,
    modelo: dados.modelo,
    capacidade_btu: dados.capacidadeBtu,
    numero_serie: dados.numeroSerie,
    patrimonio: dados.patrimonio,
    data_instalacao: dados.dataInstalacao,
    periodicidade_dias: dados.periodicidadeDias,
    observacoes: dados.observacoes,
  } satisfies Partial<TablesInsert<'equipamentos'>>;
}

export function ordenarPapeis(papeis: Papel[]): Papel[] {
  const ordem: Papel[] = ['admin', 'gestor', 'tecnico'];
  return ordem.filter((papel) => papeis.includes(papel));
}

type Pessoa = { nome: string; email: string };

/** Nome do perfil; se a pessoa ainda não preencheu, o e-mail. */
export function nomeDaPessoa(pessoa: Pessoa | null): string | null {
  if (!pessoa) return null;
  return pessoa.nome.trim() || pessoa.email;
}

/** Colunas pedidas ao ler OS: nomes de cliente, local, técnico, autor e os equipamentos. */
export const COLUNAS_ORDEM = `*,
  cliente:clientes!inner(nome),
  local:locais_atendimento!inner(nome),
  tecnico:organizacao_usuarios!ordens_servico_organizacao_id_tecnico_id_fkey(usuario:usuarios!inner(nome, email)),
  autor:usuarios!ordens_servico_aberta_por_fkey(nome, email),
  equipamentos:ordem_servico_equipamentos(equipamento:equipamentos!inner(id, identificacao))`;

export type LinhaOrdem = Tables<'ordens_servico'> & {
  cliente: { nome: string };
  local: { nome: string };
  tecnico: { usuario: Pessoa } | null;
  autor: Pessoa | null;
  equipamentos: { equipamento: { id: string; identificacao: string } }[];
};

export function mapearOrdem(linha: LinhaOrdem): Ordem {
  return {
    id: linha.id,
    organizacaoId: linha.organizacao_id,
    numero: linha.numero,
    clienteId: linha.cliente_id,
    clienteNome: linha.cliente.nome,
    localId: linha.local_id,
    localNome: linha.local.nome,
    tipoServico: linha.tipo_servico,
    prioridade: linha.prioridade,
    problema: linha.problema,
    solicitante: linha.solicitante,
    status: linha.status,
    tecnicoId: linha.tecnico_id,
    tecnicoNome: nomeDaPessoa(linha.tecnico?.usuario ?? null),
    agendadaPara: linha.agendada_para,
    duracaoMinutos: linha.duracao_minutos,
    motivoCancelamento: linha.motivo_cancelamento,
    abertaPorNome: nomeDaPessoa(linha.autor),
    criadoEm: linha.criado_em,
    equipamentos: linha.equipamentos
      .map(({ equipamento }) => equipamento)
      .sort((a, b) => a.identificacao.localeCompare(b.identificacao, 'pt-BR')),
  };
}

type ArgumentosOrdem = Omit<
  Database['public']['Functions']['abrir_ordem_servico']['Args'],
  'p_organizacao_id'
>;

/** Parâmetros das funções abrir_ordem_servico e editar_ordem_servico. */
export function argumentosOrdem(dados: DadosOrdem): ArgumentosOrdem {
  return {
    p_cliente_id: dados.clienteId,
    p_local_id: dados.localId,
    p_tipo_servico: dados.tipoServico,
    p_prioridade: dados.prioridade,
    p_problema: dados.problema,
    // O gerador de tipos não marca parâmetros de função como opcionais; a função aceita null.
    p_solicitante: dados.solicitante as string,
    p_equipamento_ids: dados.equipamentoIds,
  };
}

export type LinhaEvento = Tables<'ordem_servico_eventos'> & { usuario: Pessoa | null };

export function mapearEvento(linha: LinhaEvento): EventoOrdem {
  return {
    id: linha.id,
    tipo: linha.tipo,
    statusAnterior: linha.status_anterior,
    statusNovo: linha.status_novo,
    descricao: linha.descricao,
    usuarioNome: nomeDaPessoa(linha.usuario),
    criadoEm: linha.criado_em,
  };
}
