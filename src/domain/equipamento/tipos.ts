import { z } from 'zod';
import {
  dataOpcional,
  inteiroOpcional,
  textoObrigatorio,
  textoOpcional,
} from '@/domain/comum/campos';

export const TIPOS_EQUIPAMENTO = [
  'split',
  'janela',
  'cassete',
  'piso_teto',
  'multi_split',
  'vrf',
  'fancoil',
  'chiller',
  'self_contained',
  'camara_fria',
  'balcao_refrigerado',
  'outro',
] as const;

export type TipoEquipamento = (typeof TIPOS_EQUIPAMENTO)[number];

export const ROTULOS_TIPO_EQUIPAMENTO: Record<TipoEquipamento, string> = {
  split: 'Split',
  janela: 'Janela',
  cassete: 'Cassete',
  piso_teto: 'Piso-teto',
  multi_split: 'Multi-split',
  vrf: 'VRF',
  fancoil: 'Fancoil',
  chiller: 'Chiller',
  self_contained: 'Self-contained',
  camara_fria: 'Câmara fria',
  balcao_refrigerado: 'Balcão refrigerado',
  outro: 'Outro',
};

/** Periodicidades mais usadas em manutenção preventiva (valor em dias). */
export const PERIODICIDADES = [
  { dias: 30, rotulo: 'Mensal' },
  { dias: 60, rotulo: 'Bimestral' },
  { dias: 90, rotulo: 'Trimestral' },
  { dias: 180, rotulo: 'Semestral' },
  { dias: 365, rotulo: 'Anual' },
] as const;

export function rotuloPeriodicidade(dias: number | null): string {
  if (dias === null) return 'Sem preventiva';
  const conhecida = PERIODICIDADES.find((periodicidade) => periodicidade.dias === dias);
  return conhecida ? conhecida.rotulo : `A cada ${dias} dias`;
}

export type Equipamento = {
  id: string;
  organizacaoId: string;
  localId: string;
  identificacao: string;
  tipo: TipoEquipamento;
  marca: string | null;
  modelo: string | null;
  capacidadeBtu: number | null;
  numeroSerie: string | null;
  patrimonio: string | null;
  /** AAAA-MM-DD */
  dataInstalacao: string | null;
  periodicidadeDias: number | null;
  /** AAAA-MM-DD */
  proximaManutencao: string | null;
  observacoes: string | null;
  ativo: boolean;
  /** Dados do local e do cliente, só para exibição. */
  localNome: string;
  clienteId: string;
  clienteNome: string;
};

export const EquipamentoFormularioSchema = z.object({
  localId: z.string().uuid('Escolha o local'),
  identificacao: textoObrigatorio('a identificação', 2, 120),
  tipo: z.enum(TIPOS_EQUIPAMENTO, { errorMap: () => ({ message: 'Escolha o tipo' }) }),
  marca: textoOpcional(60),
  modelo: textoOpcional(80),
  capacidadeBtu: inteiroOpcional('A capacidade', 1, 10_000_000),
  numeroSerie: textoOpcional(80),
  patrimonio: textoOpcional(40),
  dataInstalacao: dataOpcional,
  periodicidadeDias: inteiroOpcional('A periodicidade', 1, 3650),
  /** Calculada ao concluir uma preventiva (etapa 8); aqui o gestor ajusta se precisar. */
  proximaManutencao: dataOpcional,
  observacoes: textoOpcional(2000),
});

export type EquipamentoFormulario = z.input<typeof EquipamentoFormularioSchema>;
export type DadosEquipamento = z.output<typeof EquipamentoFormularioSchema>;

export const EQUIPAMENTO_FORMULARIO_VAZIO: EquipamentoFormulario = {
  localId: '',
  identificacao: '',
  tipo: 'split',
  marca: '',
  modelo: '',
  capacidadeBtu: '',
  numeroSerie: '',
  patrimonio: '',
  dataInstalacao: '',
  periodicidadeDias: '',
  proximaManutencao: '',
  observacoes: '',
};

export function formatarCapacidade(btu: number | null): string {
  if (btu === null) return '—';
  return `${btu.toLocaleString('pt-BR')} BTU/h`;
}

export function equipamentoParaFormulario(equipamento: Equipamento): EquipamentoFormulario {
  return {
    localId: equipamento.localId,
    identificacao: equipamento.identificacao,
    tipo: equipamento.tipo,
    marca: equipamento.marca ?? '',
    modelo: equipamento.modelo ?? '',
    capacidadeBtu: equipamento.capacidadeBtu === null ? '' : String(equipamento.capacidadeBtu),
    numeroSerie: equipamento.numeroSerie ?? '',
    patrimonio: equipamento.patrimonio ?? '',
    dataInstalacao: equipamento.dataInstalacao ?? '',
    periodicidadeDias:
      equipamento.periodicidadeDias === null ? '' : String(equipamento.periodicidadeDias),
    proximaManutencao: equipamento.proximaManutencao ?? '',
    observacoes: equipamento.observacoes ?? '',
  };
}
