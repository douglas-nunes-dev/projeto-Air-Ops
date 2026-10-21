import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useImperativeHandle, type Ref } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControleAssinatura } from '@/components/execucao/CampoAssinatura';
import { ErroDados } from '@/domain/erros';
import type { Execucao, FotoPendente } from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import type { OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';
import { listarLocaisDoCliente } from '@/services/clienteService';
import { concluirAtendimento, prepararRelatorio } from '@/services/conclusaoService';
import { buscarExecucao } from '@/services/execucaoService';
import { buscarOrdem, listarEventosDaOrdem } from '@/services/ordemService';
import { listarFotosPendentes, observarFilaDeFotos } from '@/services/storageService';
import { ordemDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas, usuarioDeTeste } from '@/test/renderizar';
import { DetalheOrdem } from '../ordens/DetalheOrdem';
import { ConcluirOrdem } from './ConcluirOrdem';
import { ExecucaoOrdem } from './ExecucaoOrdem';

vi.mock('@/services/ordemService');
vi.mock('@/services/execucaoService');
vi.mock('@/services/clienteService');
vi.mock('@/services/storageService');
vi.mock('@/services/conclusaoService');
vi.mock('@/services/organizacaoService');

// O jsdom não desenha em canvas: no lugar do quadro, um botão "assina".
const imagemAssinatura = new Blob(['jpeg'], { type: 'image/jpeg' });
vi.mock('@/components/execucao/CampoAssinatura', () => ({
  CampoAssinatura: ({
    ref,
    aoMudar,
  }: {
    ref?: Ref<ControleAssinatura>;
    aoMudar: (assinou: boolean) => void;
  }) => {
    useImperativeHandle(ref, () => ({ obterImagem: async () => imagemAssinatura }));
    return (
      <button type="button" onClick={() => aoMudar(true)}>
        Assinar (teste)
      </button>
    );
  },
}));

const tecnico: OrganizacaoDoUsuario = { ...organizacaoDeTeste, papeis: ['tecnico'] };
const gestor: OrganizacaoDoUsuario = { ...organizacaoDeTeste, papeis: ['gestor'] };
const sessao = { usuario: usuarioDeTeste };

const emExecucao: Ordem = {
  ...ordemDeTeste,
  status: 'em_execucao',
  tecnicoId: usuarioDeTeste.id,
  tecnicoNome: 'João',
  agendadaPara: '2026-10-23T13:00:00.000Z',
};
const concluida: Ordem = { ...emExecucao, status: 'concluida' };

const pronta: Execucao = {
  anotacoes: { diagnostico: 'Capacitor queimado, trocado', materiais: '1 capacitor' },
  checklist: [{ posicao: 1, item: 'Dreno', resposta: 'ok', observacao: null }],
  atividades: [],
  fotos: [
    {
      id: 'f1',
      caminho: 'org/os/f1.jpg',
      legenda: null,
      tiradaEm: '2026-10-23T13:30:00Z',
      criadoPorNome: 'João',
    },
  ],
  assinatura: null,
};

function abrirConclusao(execucao = pronta, organizacao = tecnico) {
  vi.mocked(buscarOrdem).mockResolvedValue(emExecucao);
  vi.mocked(buscarExecucao).mockResolvedValue(execucao);
  return renderizarComRotas(<ConcluirOrdem />, '/campo/ordens/:id/concluir', {
    rota: `/campo/ordens/${emExecucao.id}/concluir`,
    organizacao,
    sessao,
    outrasRotas: { '/campo/ordens/:id': <p>Tela da OS</p> },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarEventosDaOrdem).mockResolvedValue([]);
  vi.mocked(listarLocaisDoCliente).mockResolvedValue([]);
  vi.mocked(listarFotosPendentes).mockResolvedValue([]);
  vi.mocked(observarFilaDeFotos).mockReturnValue(() => true);
});

describe('Concluir atendimento', () => {
  it('com tudo pronto: assina, informa o nome e conclui', async () => {
    vi.mocked(concluirAtendimento).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirConclusao();

    expect(await screen.findByText('Tudo pronto para concluir.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Assinar (teste)' }));
    await usuario.type(screen.getByLabelText('Nome de quem assinou'), 'Carla Souza');
    await usuario.click(screen.getByRole('button', { name: 'Concluir OS' }));

    expect(await screen.findByText('Tela da OS')).toBeInTheDocument();
    expect(concluirAtendimento).toHaveBeenCalledWith({
      ordem: emExecucao,
      quem: { usuarioId: usuarioDeTeste.id, papeis: ['tecnico'] },
      execucao: pronta,
      fotosNaFila: 0,
      formulario: {
        semAssinatura: false,
        assinou: true,
        nomeAssinante: 'Carla Souza',
        motivoSemAssinatura: '',
      },
      imagemAssinatura,
    });
  });

  it('sem assinar nem informar o nome, mostra o que falta e não envia', async () => {
    const usuario = userEvent.setup();
    abrirConclusao();

    await usuario.click(await screen.findByRole('button', { name: 'Concluir OS' }));

    expect(screen.getByText('Peça para o cliente assinar no quadro')).toBeInTheDocument();
    expect(screen.getByText('Informe o nome de quem assinou')).toBeInTheDocument();
    expect(concluirAtendimento).not.toHaveBeenCalled();
  });

  it('cliente não pôde assinar: conclui com o motivo, sem imagem', async () => {
    vi.mocked(concluirAtendimento).mockResolvedValue();
    const usuario = userEvent.setup();
    abrirConclusao();

    await usuario.click(await screen.findByLabelText('O cliente não pôde assinar'));
    await usuario.type(
      screen.getByLabelText('Por que não há assinatura?'),
      'Responsável ausente no momento',
    );
    await usuario.click(screen.getByRole('button', { name: 'Concluir OS' }));

    await screen.findByText('Tela da OS');
    expect(concluirAtendimento).toHaveBeenCalledWith(
      expect.objectContaining({
        formulario: expect.objectContaining({
          semAssinatura: true,
          motivoSemAssinatura: 'Responsável ausente no momento',
        }),
        imagemAssinatura: null,
      }),
    );
  });

  it('sem diagnóstico, sem foto e com foto na fila: lista o que falta e trava o botão', async () => {
    vi.mocked(listarFotosPendentes).mockResolvedValue([{ id: 'p' } as FotoPendente]);
    abrirConclusao({ ...pronta, anotacoes: { diagnostico: null, materiais: null }, fotos: [] });

    expect(await screen.findByText('Preencha o diagnóstico.')).toBeInTheDocument();
    expect(screen.getByText('Envie pelo menos uma foto.')).toBeInTheDocument();
    expect(await screen.findByText('Aguarde as fotos terminarem de enviar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Concluir OS' })).toBeDisabled();
  });

  it('se o servidor recusar, mostra a mensagem dele', async () => {
    vi.mocked(concluirAtendimento).mockRejectedValue(
      new ErroDados('dados_invalidos', { mensagem: 'A assinatura não chegou ao servidor.' }),
    );
    const usuario = userEvent.setup();
    abrirConclusao();

    await usuario.click(await screen.findByRole('button', { name: 'Assinar (teste)' }));
    await usuario.type(screen.getByLabelText('Nome de quem assinou'), 'Carla');
    await usuario.click(screen.getByRole('button', { name: 'Concluir OS' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A assinatura não chegou ao servidor.',
    );
  });

  it('quem não é o técnico da OS não conclui', async () => {
    abrirConclusao(pronta, gestor);
    expect(
      await screen.findByText('Só o técnico da OS conclui, com o atendimento em andamento.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Concluir OS' })).not.toBeInTheDocument();
  });
});

describe('Depois de concluída', () => {
  it('no celular: assinatura registrada e "Compartilhar relatório"', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(concluida);
    vi.mocked(buscarExecucao).mockResolvedValue({
      ...pronta,
      assinatura: {
        nomeAssinante: null,
        caminho: null,
        motivoSemAssinatura: 'Responsável ausente',
        criadoEm: '2026-10-23T14:00:00Z',
      },
    });
    renderizarComRotas(<ExecucaoOrdem />, '/campo/ordens/:id', {
      rota: `/campo/ordens/${concluida.id}`,
      organizacao: tecnico,
      sessao,
    });

    expect(await screen.findByText('Atendimento concluído.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compartilhar relatório' })).toBeInTheDocument();
    expect(
      await screen.findByText(/Sem assinatura do cliente. Motivo: Responsável ausente/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Concluir atendimento' })).not.toBeInTheDocument();
  });

  it('em execução: o técnico vê "Concluir atendimento"', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(emExecucao);
    vi.mocked(buscarExecucao).mockResolvedValue(pronta);
    renderizarComRotas(<ExecucaoOrdem />, '/campo/ordens/:id', {
      rota: `/campo/ordens/${emExecucao.id}`,
      organizacao: tecnico,
      sessao,
    });

    expect(await screen.findByRole('link', { name: 'Concluir atendimento' })).toHaveAttribute(
      'href',
      `/campo/ordens/${emExecucao.id}/concluir`,
    );
  });

  it('no escritório: "Baixar relatório (PDF)" gera o relatório com o nome da empresa', async () => {
    vi.mocked(buscarOrdem).mockResolvedValue(concluida);
    vi.mocked(buscarExecucao).mockResolvedValue(pronta);
    // Para o teste no ponto em que o PDF seria gerado (sem canvas/fontes no jsdom).
    vi.mocked(prepararRelatorio).mockRejectedValue(new ErroDados('sem_conexao'));
    const usuario = userEvent.setup();
    renderizarComRotas(<DetalheOrdem />, '/ordens/:id', {
      rota: `/ordens/${concluida.id}`,
      organizacao: gestor,
      sessao,
    });

    await usuario.click(await screen.findByRole('button', { name: 'Baixar relatório (PDF)' }));

    expect(prepararRelatorio).toHaveBeenCalledWith(concluida, organizacaoDeTeste.nome);
    expect(await screen.findByText(/Não foi possível gerar o relatório/)).toBeInTheDocument();
  });
});
