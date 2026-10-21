// Regras da mudança de status da OS (seções 4 e 11). Sem Deno nem Supabase: só decide o que
// gravar, para dar para testar com o Vitest e reaproveitar numa rota da API Node no futuro.
// Importa com ".ts" no fim porque o Deno exige a extensão.
import { podeTransitar, type StatusOrdem } from '../../../src/domain/ordem/transicoes.ts';

export const FUSO_DA_EMPRESA = 'America/Sao_Paulo';
export const DURACAO_MINIMA = 15;
export const DURACAO_MAXIMA = 720;
export const MOTIVO_MINIMO = 5;
export const MOTIVO_MAXIMO = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Pedido =
  | {
      acao: 'agendar';
      ordemId: string;
      tecnicoId: string;
      /** Data e hora em ISO 8601. */
      agendadaPara: string;
      duracaoMinutos: number;
    }
  | { acao: 'cancelar'; ordemId: string; motivo: string };

export type CodigoErro =
  'sem_permissao' | 'nao_encontrado' | 'transicao_invalida' | 'dados_invalidos';

export type Recusa = { ok: false; codigo: CodigoErro; mensagem: string; campo?: string };

export type OrdemAtual = {
  status: StatusOrdem;
  tecnicoId: string | null;
  agendadaPara: string | null;
  duracaoMinutos: number;
};

/** Vínculo de uma pessoa com a empresa da OS; null = não é da empresa. */
export type Vinculo = { papeis: string[]; ativo: boolean; nome: string } | null;

/** Parâmetros da função registrar_mudanca_status do banco. */
export type Gravacao = {
  p_ordem_id: string;
  p_status_esperado: StatusOrdem;
  p_status_novo: StatusOrdem;
  p_tecnico_id: string | null;
  p_agendada_para: string | null;
  p_duracao_minutos: number;
  p_motivo_cancelamento: string | null;
  p_tipo_evento: 'mudanca_status' | 'reagendamento';
  p_descricao: string;
  p_usuario_id: string;
};

function recusar(codigo: CodigoErro, mensagem: string, campo?: string): Recusa {
  return { ok: false, codigo, mensagem, campo };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Confere o formato do que chegou do navegador (que não é confiável). */
export function lerPedido(corpo: unknown): { ok: true; pedido: Pedido } | Recusa {
  if (typeof corpo !== 'object' || corpo === null) {
    return recusar('dados_invalidos', 'Pedido vazio.');
  }
  const dados = corpo as Record<string, unknown>;
  const ordemId = texto(dados.ordemId);
  if (!UUID.test(ordemId)) return recusar('dados_invalidos', 'OS inválida.');

  if (dados.acao === 'agendar') {
    const tecnicoId = texto(dados.tecnicoId);
    if (!UUID.test(tecnicoId)) return recusar('dados_invalidos', 'Escolha o técnico', 'tecnicoId');

    const agendadaPara = texto(dados.agendadaPara);
    if (Number.isNaN(Date.parse(agendadaPara))) {
      return recusar('dados_invalidos', 'Informe uma data e hora válidas', 'data');
    }

    const duracaoMinutos = Number(dados.duracaoMinutos);
    if (
      !Number.isInteger(duracaoMinutos) ||
      duracaoMinutos < DURACAO_MINIMA ||
      duracaoMinutos > DURACAO_MAXIMA
    ) {
      return recusar(
        'dados_invalidos',
        `A duração deve ficar entre ${DURACAO_MINIMA} minutos e ${DURACAO_MAXIMA / 60} horas`,
        'duracaoMinutos',
      );
    }
    return {
      ok: true,
      pedido: {
        acao: 'agendar',
        ordemId,
        tecnicoId,
        agendadaPara: new Date(agendadaPara).toISOString(),
        duracaoMinutos,
      },
    };
  }

  if (dados.acao === 'cancelar') {
    const motivo = texto(dados.motivo);
    if (motivo.length < MOTIVO_MINIMO || motivo.length > MOTIVO_MAXIMO) {
      return recusar(
        'dados_invalidos',
        `Escreva o motivo (de ${MOTIVO_MINIMO} a ${MOTIVO_MAXIMO} caracteres)`,
        'motivo',
      );
    }
    return { ok: true, pedido: { acao: 'cancelar', ordemId, motivo } };
  }

  return recusar('dados_invalidos', 'Ação desconhecida.');
}

/** "qui., 22/10 às 10:00", sempre no horário da empresa (o servidor roda em UTC). */
export function formatarHorario(iso: string): string {
  const data = new Date(iso);
  const dia = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_DA_EMPRESA,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(data);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_DA_EMPRESA,
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
  return `${dia} às ${hora}`;
}

function podeGerenciar(vinculo: Vinculo): boolean {
  if (!vinculo?.ativo) return false;
  return vinculo.papeis.includes('admin') || vinculo.papeis.includes('gestor');
}

type Contexto = {
  pedido: Pedido;
  usuarioId: string;
  /** null = a OS não existe. */
  ordem: OrdemAtual | null;
  /** Vínculo de quem pediu com a empresa da OS. */
  quemPede: Vinculo;
  /** Vínculo do técnico escolhido (só ao agendar). */
  tecnico: Vinculo;
};

/** Decide se a mudança pode acontecer e, se puder, o que gravar. */
export function decidir(contexto: Contexto): { ok: true; gravacao: Gravacao } | Recusa {
  const { pedido, usuarioId, ordem, quemPede, tecnico } = contexto;

  // Quem não é da empresa recebe "não encontrada": não revela que a OS existe.
  if (!ordem || !quemPede?.ativo) return recusar('nao_encontrado', 'OS não encontrada.');
  if (!podeGerenciar(quemPede)) {
    return recusar('sem_permissao', 'Só administradores e gestores planejam e cancelam OS.');
  }

  if (pedido.acao === 'cancelar') {
    if (!podeTransitar(ordem.status, 'cancelada')) {
      return recusar('transicao_invalida', 'Esta OS já foi encerrada e não pode ser cancelada.');
    }
    return {
      ok: true,
      gravacao: {
        p_ordem_id: pedido.ordemId,
        p_status_esperado: ordem.status,
        p_status_novo: 'cancelada',
        // Técnico e horário continuam guardados, como registro do que estava planejado.
        p_tecnico_id: ordem.tecnicoId,
        p_agendada_para: ordem.agendadaPara,
        p_duracao_minutos: ordem.duracaoMinutos,
        p_motivo_cancelamento: pedido.motivo,
        p_tipo_evento: 'mudanca_status',
        p_descricao: `Motivo: ${pedido.motivo}`,
        p_usuario_id: usuarioId,
      },
    };
  }

  if (!podeTransitar(ordem.status, 'agendada')) {
    return recusar(
      'transicao_invalida',
      ordem.status === 'em_execucao'
        ? 'A OS está em execução. Pause antes de reagendar.'
        : 'Esta OS já foi encerrada e não pode ser agendada.',
    );
  }
  if (!tecnico?.ativo || !tecnico.papeis.includes('tecnico')) {
    return recusar('dados_invalidos', 'Escolha um técnico ativo da empresa.', 'tecnicoId');
  }

  const reagendamento = ordem.status === 'agendada';
  const acao = reagendamento ? 'Reagendada' : 'Agendada';
  return {
    ok: true,
    gravacao: {
      p_ordem_id: pedido.ordemId,
      p_status_esperado: ordem.status,
      p_status_novo: 'agendada',
      p_tecnico_id: pedido.tecnicoId,
      p_agendada_para: pedido.agendadaPara,
      p_duracao_minutos: pedido.duracaoMinutos,
      p_motivo_cancelamento: null,
      p_tipo_evento: reagendamento ? 'reagendamento' : 'mudanca_status',
      p_descricao: `${acao} para ${formatarHorario(pedido.agendadaPara)} — ${tecnico.nome}`,
      p_usuario_id: usuarioId,
    },
  };
}

/** Código HTTP de cada recusa. */
export const STATUS_HTTP: Record<CodigoErro, number> = {
  dados_invalidos: 400,
  sem_permissao: 403,
  nao_encontrado: 404,
  transicao_invalida: 409,
};
