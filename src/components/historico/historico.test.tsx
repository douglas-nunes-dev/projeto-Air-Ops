import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtendimentoHistorico } from '@/domain/historico/historico';
import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';
import {
  listarHistoricoDoCliente,
  listarHistoricoDoEquipamento,
} from '@/services/historicoService';
import { organizacaoDeTeste, renderizarComRotas, usuarioDeTeste } from '@/test/renderizar';
import { HistoricoDoCliente, HistoricoDoEquipamento } from './LinhaDoTempo';

vi.mock('@/services/historicoService');

const tecnico: OrganizacaoDoUsuario = { ...organizacaoDeTeste, papeis: ['tecnico'] };
const sessao = { usuario: usuarioDeTeste };

function atendimento(mudancas: Partial<AtendimentoHistorico>): AtendimentoHistorico {
  return {
    ordemId: 'os-1',
    numero: 1,
    localNome: 'UTI',
    tipoServico: 'corretiva',
    status: 'concluida',
    problema: 'Não gela',
    tecnicoId: usuarioDeTeste.id,
    tecnicoNome: 'João',
    agendadaPara: null,
    criadoEm: new Date().toISOString(),
    concluidaEm: new Date().toISOString(),
    diagnostico: null,
    fotos: 0,
    naoConformes: 0,
    ...mudancas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Histórico do equipamento', () => {
  it('mostra o resumo e cada atendimento com diagnóstico, não conformidades e fotos', async () => {
    vi.mocked(listarHistoricoDoEquipamento).mockResolvedValue([
      atendimento({
        ordemId: 'os-12',
        numero: 12,
        tipoServico: 'preventiva',
        diagnostico: 'Dreno entupido, desobstruído',
        naoConformes: 1,
        fotos: 3,
      }),
      atendimento({ ordemId: 'os-9', numero: 9, status: 'cancelada', concluidaEm: null }),
    ]);
    renderizarComRotas(<HistoricoDoEquipamento equipamentoId="eq-1" />, '/');

    expect(await screen.findByText('Dreno entupido, desobstruído')).toBeInTheDocument();
    expect(screen.getByText('1 não conformidade')).toBeInTheDocument();
    expect(screen.getByText('3 fotos')).toBeInTheDocument();
    // Sem diagnóstico, mostra o problema relatado.
    expect(screen.getByText('Problema: Não gela')).toBeInTheDocument();
    // Cancelada não conta como atendimento.
    const resumo = screen.getByText('Atendimentos').closest('div')!;
    expect(within(resumo).getByText('1')).toBeInTheDocument();
    expect(listarHistoricoDoEquipamento).toHaveBeenCalledWith('eq-1');
  });

  it('3 corretivas em 12 meses ficam em destaque', async () => {
    vi.mocked(listarHistoricoDoEquipamento).mockResolvedValue(
      [1, 2, 3].map((numero) => atendimento({ ordemId: `os-${numero}`, numero })),
    );
    renderizarComRotas(<HistoricoDoEquipamento equipamentoId="eq-1" />, '/');

    const corretivas = (await screen.findByText('Corretivas (12 meses)')).closest('div')!;
    expect(corretivas).toHaveClass('text-destructive');
    expect(within(corretivas).getByText('3')).toBeInTheDocument();
  });

  it('técnico: a OS dele vira link; a de outro técnico aparece só em resumo', async () => {
    vi.mocked(listarHistoricoDoEquipamento).mockResolvedValue([
      atendimento({ ordemId: 'minha', numero: 5 }),
      atendimento({ ordemId: 'do-outro', numero: 6, tecnicoId: 'outro', tecnicoNome: 'Pedro' }),
    ]);
    renderizarComRotas(<HistoricoDoEquipamento equipamentoId="eq-1" />, '/', {
      organizacao: tecnico,
      sessao,
    });

    expect(await screen.findByRole('link', { name: 'OS 5' })).toHaveAttribute(
      'href',
      '/ordens/minha',
    );
    expect(screen.queryByRole('link', { name: 'OS 6' })).not.toBeInTheDocument();
    expect(screen.getByText('OS 6')).toBeInTheDocument();
    expect(screen.getByText('Pedro')).toBeInTheDocument();
  });

  it('sem atendimentos, avisa', async () => {
    vi.mocked(listarHistoricoDoEquipamento).mockResolvedValue([]);
    renderizarComRotas(<HistoricoDoEquipamento equipamentoId="eq-1" />, '/');
    expect(
      await screen.findByText('Este equipamento ainda não teve atendimentos.'),
    ).toBeInTheDocument();
  });
});

describe('Histórico do cliente', () => {
  it('filtra por local quando o cliente tem vários', async () => {
    vi.mocked(listarHistoricoDoCliente).mockResolvedValue([
      atendimento({ ordemId: 'a', numero: 1, localNome: 'UTI', diagnostico: 'Na UTI' }),
      atendimento({ ordemId: 'b', numero: 2, localNome: 'Recepção', diagnostico: 'Na recepção' }),
    ]);
    const usuario = userEvent.setup();
    renderizarComRotas(<HistoricoDoCliente clienteId="cli-1" />, '/');

    expect(await screen.findByText('Na UTI')).toBeInTheDocument();
    expect(screen.getByText('Na recepção')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Local'), 'Recepção');

    expect(screen.queryByText('Na UTI')).not.toBeInTheDocument();
    expect(screen.getByText('Na recepção')).toBeInTheDocument();
  });
});
