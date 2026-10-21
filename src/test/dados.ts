import type { LocalAtendimento } from '@/domain/cliente/local';
import type { Cliente } from '@/domain/cliente/tipos';
import type { Equipamento } from '@/domain/equipamento/tipos';
import type { Ordem } from '@/domain/ordem/tipos';
import { organizacaoDeTeste } from './renderizar';

// Cadastros de exemplo para os testes de tela.

export const clienteDeTeste: Cliente = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  organizacaoId: organizacaoDeTeste.id,
  tipoPessoa: 'juridica',
  nome: 'Hospital São Lucas',
  documento: '11222333000181',
  telefone: '35999998888',
  email: 'manutencao@saolucas.com.br',
  contatoNome: 'Marta',
  observacoes: null,
  ativo: true,
};

export const localDeTeste: LocalAtendimento = {
  id: 'bbbbbbbb-0000-4000-8000-000000000001',
  organizacaoId: organizacaoDeTeste.id,
  clienteId: clienteDeTeste.id,
  nome: 'Bloco B — UTI',
  cep: '37900000',
  logradouro: 'Rua Dr. Manoel Patti',
  numero: '1000',
  complemento: null,
  bairro: 'Centro',
  cidade: 'Passos',
  uf: 'MG',
  observacoes: null,
  ativo: true,
};

export const equipamentoDeTeste: Equipamento = {
  id: 'cccccccc-0000-4000-8000-000000000001',
  organizacaoId: organizacaoDeTeste.id,
  localId: localDeTeste.id,
  identificacao: 'Split UTI leito 3',
  tipo: 'split',
  marca: 'Springer',
  modelo: 'Xtreme Save',
  capacidadeBtu: 18000,
  numeroSerie: 'SN-123',
  patrimonio: 'PAT-0042',
  dataInstalacao: '2024-03-15',
  periodicidadeDias: 30,
  proximaManutencao: null,
  observacoes: null,
  ativo: true,
  localNome: localDeTeste.nome,
  clienteId: clienteDeTeste.id,
  clienteNome: clienteDeTeste.nome,
};

export const ordemDeTeste: Ordem = {
  id: 'dddddddd-0000-4000-8000-000000000001',
  organizacaoId: organizacaoDeTeste.id,
  numero: 7,
  clienteId: clienteDeTeste.id,
  clienteNome: clienteDeTeste.nome,
  localId: localDeTeste.id,
  localNome: localDeTeste.nome,
  tipoServico: 'corretiva',
  prioridade: 'alta',
  problema: 'Split não está gelando e faz barulho.',
  solicitante: 'Enfermeira Carla',
  status: 'aberta',
  tecnicoId: null,
  tecnicoNome: null,
  agendadaPara: null,
  abertaPorNome: 'Gestor Teste',
  criadoEm: '2026-10-20T13:30:00.000Z',
  equipamentos: [{ id: equipamentoDeTeste.id, identificacao: equipamentoDeTeste.identificacao }],
};
