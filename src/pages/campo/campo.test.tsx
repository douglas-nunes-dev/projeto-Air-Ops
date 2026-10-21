import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Execucao } from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { abreNoModoTecnico, type OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';
import { listarLocaisDoCliente } from '@/services/clienteService';
import { ErroDados } from '@/domain/erros';
import {
  adicionarAtividade,
  buscarExecucao,
  prepararChecklist,
  responderItemChecklist,
  salvarAnotacoes,
} from '@/services/execucaoService';
import {
  buscarOrdem,
  iniciarExecucao,
  listarEventosDaOrdem,
  listarOrdens,
  pausarExecucao,
} from '@/services/ordemService';
import { listarFotosPendentes, observarFilaDeFotos } from '@/services/storageService';
import { localDeTeste, ordemDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas, usuarioDeTeste } from '@/test/renderizar';
import { DetalheOrdem } from '../ordens/DetalheOrdem';
import { ExecucaoOrdem } from './ExecucaoOrdem';
import { Hoje } from './Hoje';

vi.mock('@/services/ordemService');
vi.mock('@/services/execucaoService');
vi.mock('@/services/clienteService');
vi.mock('@/services/storageService');
vi.mock('@/services/organizacaoService');

const tecnico: OrganizacaoDoUsuario = { ...organizacaoDeTeste, papeis: ['tecnico'] };
const gestor: OrganizacaoDoUsuario = { ...organizacaoDeTeste, papeis: ['gestor'] };
const sessao = { usuario: usuarioDeTeste };

const agendadaParaMim: Ordem = {
  ...ordemDeTeste,
  status: 'agendada',
  tecnicoId: usuarioDeTeste.id,
  tecnicoNome: 'João',
  agendadaPara: new Date().toISOString(),
};
const emExecucao: Ordem = { ...agendadaParaMim, status: 'em_execucao' };

const execucaoComChecklist: Execucao = {
  anotacoes: { diagnostico: null, materiais: null },
  checklist: [
    { posicao: 1, item: 'Defeito relatado confirmado no local', resposta: null, observacao: null },
    { posicao: 2, item: 'Teste de funcionamento', resposta: 'ok', observacao: null },
  ],
  atividades: [],
  fotos: [],
};

function abrirExecucao(ordem: Ordem, organizacao = tecnico) {
  vi.mocked(buscarOrdem).mockResolvedValue(ordem);
  return renderizarComRotas(<ExecucaoOrdem />, '/campo/ordens/:id', {
    rota: `/campo/ordens/${ordem.id}`,
    organizacao,
    sessao,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarEventosDaOrdem).mockResolvedValue([]);
  vi.mocked(listarLocaisDoCliente).mockResolvedValue([localDeTeste]);
  vi.mocked(buscarExecucao).mockResolvedValue(execucaoComChecklist);
  vi.mocked(prepararChecklist).mockResolvedValue();
  vi.mocked(listarFotosPendentes).mockResolvedValue([]);
  vi.mocked(observarFilaDeFotos).mockReturnValue(() => true);
});

describe('abreNoModoTecnico', () => {
  it('técnico sempre; modo autônomo só no celular; gestor nunca', () => {
    expect(abreNoModoTecnico(['tecnico'], false)).toBe(true);
    expect(abreNoModoTecnico(['admin', 'gestor', 'tecnico'], true)).toBe(true);
    expect(abreNoModoTecnico(['admin', 'gestor', 'tecnico'], false)).toBe(false);
    expect(abreNoModoTecnico(['gestor'], true)).toBe(false);
  });
});

describe('Hoje', () => {
  it('mostra só as OS do técnico, separadas em andamento e agendadas para hoje', async () => {
    vi.mocked(listarOrdens).mockResolvedValue([
      { ...agendadaParaMim, id: 'minha-agendada', numero: 1 },
      { ...emExecucao, id: 'minha-em-execucao', numero: 2 },
      { ...agendadaParaMim, id: 'de-outro', numero: 3, tecnicoId: 'outro-tecnico' },
    ]);
    renderizarComRotas(<Hoje />, '/campo', { organizacao: tecnico, sessao });

    const emAndamento = (await screen.findByText('Em andamento (1)')).closest('section')!;
    expect(within(emAndamento).getByText('OS 2')).toBeInTheDocument();
    const deHoje = screen.getByText('Agendadas para hoje (1)').closest('section')!;
    expect(within(deHoje).getByText('OS 1')).toBeInTheDocument();
    expect(screen.queryByText('OS 3')).not.toBeInTheDocument();
  });
});

describe('Execução da OS', () => {
  it('o técnico inicia o atendimento', async () => {
    vi.mocked(iniciarExecucao).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirExecucao(agendadaParaMim);

    await usuario.click(await screen.findByRole('button', { name: 'Iniciar atendimento' }));

    expect(await screen.findByText('Atendimento iniciado.')).toBeInTheDocument();
    expect(iniciarExecucao).toHaveBeenCalledWith(agendadaParaMim, {
      usuarioId: usuarioDeTeste.id,
      papeis: ['tecnico'],
    });
  });

  it('em execução: responde o checklist com um toque', async () => {
    // Depois de salvar, o servidor devolve o item já respondido.
    vi.mocked(responderItemChecklist).mockImplementation(async () => {
      vi.mocked(buscarExecucao).mockResolvedValue({
        ...execucaoComChecklist,
        checklist: execucaoComChecklist.checklist.map((item) =>
          item.posicao === 1 ? { ...item, resposta: 'ok' } : item,
        ),
      });
    });
    const usuario = userEvent.setup();
    abrirExecucao(emExecucao);

    const grupo = await screen.findByRole('group', {
      name: 'Resposta: Defeito relatado confirmado no local',
    });
    await usuario.click(within(grupo).getByRole('button', { name: 'OK' }));

    expect(responderItemChecklist).toHaveBeenCalledWith(emExecucao.id, 1, 'ok', '');
    await vi.waitFor(() =>
      expect(within(grupo).getByRole('button', { name: 'OK' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('pausa escolhendo um motivo pronto', async () => {
    vi.mocked(pausarExecucao).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirExecucao(emExecucao);

    await usuario.click(await screen.findByRole('button', { name: 'Pausar' }));
    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Aguardando peça' }));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Pausar' }));

    expect(await screen.findByText('Atendimento pausado.')).toBeInTheDocument();
    expect(pausarExecucao).toHaveBeenCalledWith(
      emExecucao,
      expect.objectContaining({ usuarioId: usuarioDeTeste.id }),
      { opcao: 'Aguardando peça', outro: '' },
    );
  });

  it('quem não é o técnico da OS só acompanha: sem botões de execução', async () => {
    abrirExecucao(emExecucao, gestor);

    expect(await screen.findByText(/só ele registra a execução/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Resposta:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tirar foto' })).not.toBeInTheDocument();
    expect(await screen.findByText('Sem resposta')).toBeInTheDocument();
  });

  it('em execução sem checklist ainda: prepara a partir do modelo', async () => {
    vi.mocked(buscarExecucao).mockResolvedValue({ ...execucaoComChecklist, checklist: [] });
    abrirExecucao(emExecucao);

    await screen.findByText('Checklist');
    await vi.waitFor(() => expect(prepararChecklist).toHaveBeenCalledWith(emExecucao.id));
  });
});

describe('Registro durante a execução', () => {
  it('diagnóstico e materiais salvam sozinhos ao sair do campo', async () => {
    vi.mocked(salvarAnotacoes).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirExecucao(emExecucao);

    await usuario.type(await screen.findByLabelText('Diagnóstico'), 'Capacitor queimado');
    await usuario.type(screen.getByLabelText('Materiais utilizados'), '1 capacitor');
    await usuario.click(screen.getByText('Fotos'));

    await vi.waitFor(() =>
      expect(salvarAnotacoes).toHaveBeenLastCalledWith(emExecucao, {
        diagnostico: 'Capacitor queimado',
        materiais: '1 capacitor',
      }),
    );
    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
  });

  it('se o salvamento falhar, avisa em destaque (não só embaixo do campo)', async () => {
    vi.mocked(salvarAnotacoes).mockRejectedValue(new ErroDados('sem_permissao'));
    const usuario = userEvent.setup();
    abrirExecucao(emExecucao);

    await usuario.type(await screen.findByLabelText('Diagnóstico'), 'Teste');
    await usuario.click(screen.getByText('Fotos'));

    expect(
      await screen.findByText('Anotações não salvas: Você não tem permissão para fazer isso.'),
    ).toBeInTheDocument();
  });

  it('adiciona uma atividade', async () => {
    vi.mocked(adicionarAtividade).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirExecucao(emExecucao);

    await usuario.type(await screen.findByLabelText('Nova atividade'), 'Troca do capacitor');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(adicionarAtividade).toHaveBeenCalledWith(emExecucao, {
      descricao: 'Troca do capacitor',
    });
    await vi.waitFor(() => expect(screen.getByLabelText('Nova atividade')).toHaveValue(''));
  });

  it('trocar "não conforme" por outra resposta apaga a observação', async () => {
    vi.mocked(responderItemChecklist).mockResolvedValue();
    vi.mocked(buscarExecucao).mockResolvedValue({
      ...execucaoComChecklist,
      checklist: [
        {
          posicao: 1,
          item: 'Dreno desobstruído',
          resposta: 'nao_conforme',
          observacao: 'Dreno entupido',
        },
      ],
    });
    const usuario = userEvent.setup();
    abrirExecucao(emExecucao);

    const grupo = await screen.findByRole('group', { name: 'Resposta: Dreno desobstruído' });
    await usuario.click(within(grupo).getByRole('button', { name: 'OK' }));

    expect(responderItemChecklist).toHaveBeenCalledWith(emExecucao.id, 1, 'ok', '');
  });
});

describe('Acompanhamento no escritório', () => {
  it('o gestor vê o que o técnico registrou, sem poder editar', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(emExecucao);
    renderizarComRotas(<DetalheOrdem />, '/ordens/:id', {
      rota: `/ordens/${emExecucao.id}`,
      organizacao: gestor,
      sessao,
    });

    expect(await screen.findByText('Execução')).toBeInTheDocument();
    expect(await screen.findByText(/Defeito relatado confirmado no local/)).toBeInTheDocument();
    expect(screen.getByText(/Tempo trabalhado/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Executar' })).not.toBeInTheDocument();
  });

  it('o técnico da OS tem o atalho "Executar"', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(agendadaParaMim);
    renderizarComRotas(<DetalheOrdem />, '/ordens/:id', {
      rota: `/ordens/${agendadaParaMim.id}`,
      organizacao: tecnico,
      sessao,
    });

    expect(await screen.findByRole('link', { name: 'Executar' })).toHaveAttribute(
      'href',
      `/campo/ordens/${agendadaParaMim.id}`,
    );
  });
});
