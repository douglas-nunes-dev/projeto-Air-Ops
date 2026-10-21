import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDados } from '@/domain/erros';
import { agendarOrdem, listarOrdens } from '@/services/ordemService';
import { listarMembros } from '@/services/organizacaoService';
import { ordemDeTeste } from '@/test/dados';
import { organizacaoDeTeste, renderizarComRotas } from '@/test/renderizar';
import { Agenda } from './Agenda';
import { aguardandoAgendamento, eventosDaAgenda, ordensNaAgenda } from './eventos';

vi.mock('@/services/ordemService');
vi.mock('@/services/organizacaoService');

type EventoFalso = { id: string; title: string; start: string; end: string; editable: boolean };
type PropsFalsas = {
  events: EventoFalso[];
  initialView: string;
  eventClick: (info: { event: { id: string } }) => void;
  eventDrop: (info: unknown) => void;
};
const revert = vi.hoisted(() => vi.fn());

// O calendário de verdade não roda bem no jsdom: no lugar dele, uma lista dos blocos,
// com um botão que imita arrastar o bloco para o dia seguinte, às 9h.
vi.mock('@fullcalendar/react', () => ({
  default: ({ events, initialView, eventClick, eventDrop }: PropsFalsas): ReactNode => (
    <ul aria-label={`calendário ${initialView}`}>
      {events.map((evento) => (
        <li key={evento.id}>
          <button type="button" onClick={() => eventClick({ event: { id: evento.id } })}>
            {evento.title}
          </button>
          {evento.editable && (
            <button
              type="button"
              onClick={() =>
                eventDrop({
                  event: {
                    id: evento.id,
                    start: new Date(2026, 9, 23, 9),
                    end: new Date(2026, 9, 23, 10, 30),
                  },
                  revert,
                })
              }
            >
              Mover {evento.title}
            </button>
          )}
        </li>
      ))}
    </ul>
  ),
}));
vi.mock('@fullcalendar/react/interaction', () => ({ default: {} }));
vi.mock('@fullcalendar/react/list', () => ({ default: {} }));
vi.mock('@fullcalendar/react/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/react/themes/classic', () => ({ default: {} }));
vi.mock('@fullcalendar/react/locales/pt-br', () => ({ default: {} }));

const joao = '00000000-0000-4000-8000-000000000003';
const maria = '00000000-0000-4000-8000-000000000009';

const agendadaJoao = {
  ...ordemDeTeste,
  id: 'o1',
  numero: 1,
  status: 'agendada' as const,
  tecnicoId: joao,
  tecnicoNome: 'João',
  agendadaPara: new Date(2026, 9, 22, 14).toISOString(),
};
const emExecucaoMaria = {
  ...agendadaJoao,
  id: 'o2',
  numero: 2,
  clienteNome: 'Padaria Pão Bom',
  status: 'em_execucao' as const,
  tecnicoId: maria,
  tecnicoNome: 'Maria',
};
const abertaUrgente = { ...ordemDeTeste, id: 'o3', numero: 3, prioridade: 'urgente' as const };
const abertaBaixa = { ...ordemDeTeste, id: 'o4', numero: 4, prioridade: 'baixa' as const };
const cancelada = { ...agendadaJoao, id: 'o5', numero: 5, status: 'cancelada' as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarOrdens).mockResolvedValue([
    agendadaJoao,
    emExecucaoMaria,
    abertaBaixa,
    abertaUrgente,
    cancelada,
  ]);
  vi.mocked(listarMembros).mockResolvedValue([
    { usuarioId: joao, nome: 'João', papeis: ['tecnico'], ativo: true },
    { usuarioId: maria, nome: 'Maria', papeis: ['tecnico'], ativo: true },
  ]);
});

describe('blocos da agenda', () => {
  it('mostra só OS com horário e não canceladas; filtra por técnico', () => {
    const todas = [agendadaJoao, emExecucaoMaria, abertaUrgente, cancelada];
    expect(ordensNaAgenda(todas, '').map((ordem) => ordem.id)).toEqual(['o1', 'o2']);
    expect(ordensNaAgenda(todas, maria).map((ordem) => ordem.id)).toEqual(['o2']);
  });

  it('bloco vai do início até o fim previsto; só OS agendada pode ser arrastada', () => {
    const [bloco, emExecucao] = eventosDaAgenda(
      [{ ...agendadaJoao, duracaoMinutos: 90 }, emExecucaoMaria],
      new Date(2026, 9, 21),
      true,
    );
    expect(bloco).toMatchObject({
      id: 'o1',
      title: 'OS 1 · Hospital São Lucas',
      end: new Date(2026, 9, 22, 15, 30).toISOString(),
      editable: true,
    });
    expect(emExecucao.editable).toBe(false);
  });

  it('atrasada fica vermelha', () => {
    const [bloco] = eventosDaAgenda([agendadaJoao], new Date(2026, 9, 23), true);
    expect(bloco.backgroundColor).toBe('#dc2626');
  });

  it('aguardando agendamento: abertas e pausadas, as urgentes primeiro', () => {
    const pausada = { ...abertaBaixa, id: 'o6', numero: 6, status: 'pausada' as const };
    expect(
      aguardandoAgendamento([abertaBaixa, agendadaJoao, pausada, abertaUrgente]).map(
        (ordem) => ordem.id,
      ),
    ).toEqual(['o3', 'o4', 'o6']);
  });
});

describe('Tela da Agenda', () => {
  it('mostra os blocos e a lista de OS esperando agendamento', async () => {
    renderizarComRotas(<Agenda />, '/agenda');

    const calendario = await screen.findByRole('list', { name: /calendário/ });
    expect(within(calendario).getByText('OS 1 · Hospital São Lucas')).toBeInTheDocument();
    expect(within(calendario).getByText('OS 2 · Padaria Pão Bom')).toBeInTheDocument();
    expect(within(calendario).queryByText(/OS 5/)).not.toBeInTheDocument();

    const pendentes = screen.getByText('Aguardando agendamento').closest('div[data-slot=card]');
    const nomes = within(pendentes as HTMLElement)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(nomes).toEqual(['OS 3', 'OS 4']);
  });

  it('o filtro de técnico fica no endereço', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<Agenda />, '/agenda');

    await screen.findByRole('list', { name: /calendário/ });
    await usuario.selectOptions(await screen.findByLabelText('Técnico'), maria);

    expect(screen.getByTestId('endereco')).toHaveTextContent(`/agenda?tecnico=${maria}`);
    expect(screen.queryByText('OS 1 · Hospital São Lucas')).not.toBeInTheDocument();
    expect(screen.getByText('OS 2 · Padaria Pão Bom')).toBeInTheDocument();
  });

  it('arrastar reagenda com o mesmo técnico e a nova duração', async () => {
    vi.mocked(agendarOrdem).mockResolvedValue();
    const usuario = userEvent.setup();
    renderizarComRotas(<Agenda />, '/agenda');

    await usuario.click(
      await screen.findByRole('button', { name: 'Mover OS 1 · Hospital São Lucas' }),
    );

    expect(agendarOrdem).toHaveBeenCalledWith(agendadaJoao, {
      tecnicoId: joao,
      data: '2026-10-23',
      hora: '09:00',
      duracaoMinutos: 90,
    });
    expect(await screen.findByText('OS 1 reagendada para 23/10 às 09:00.')).toBeInTheDocument();
    expect(revert).not.toHaveBeenCalled();
  });

  it('se o servidor recusar, o bloco volta para o lugar e a mensagem aparece', async () => {
    vi.mocked(agendarOrdem).mockRejectedValue(
      new ErroDados('dados_invalidos', { mensagem: 'A OS mudou enquanto você editava.' }),
    );
    const usuario = userEvent.setup();
    renderizarComRotas(<Agenda />, '/agenda');

    await usuario.click(
      await screen.findByRole('button', { name: 'Mover OS 1 · Hospital São Lucas' }),
    );

    expect(await screen.findByText('A OS mudou enquanto você editava.')).toBeInTheDocument();
    expect(revert).toHaveBeenCalled();
  });

  it('clicar num bloco abre a OS', async () => {
    const usuario = userEvent.setup();
    renderizarComRotas(<Agenda />, '/agenda', {
      outrasRotas: { '/ordens/:id': <p>Detalhe da OS</p> },
    });

    await usuario.click(await screen.findByRole('button', { name: 'OS 1 · Hospital São Lucas' }));
    expect(await screen.findByText('Detalhe da OS')).toBeInTheDocument();
  });

  it('técnico vê só a agenda: sem filtro, sem lista de pendentes e sem arrastar', async () => {
    renderizarComRotas(<Agenda />, '/agenda', {
      organizacao: { ...organizacaoDeTeste, papeis: ['tecnico'] },
    });

    await screen.findByRole('list', { name: /calendário/ });
    expect(screen.queryByLabelText('Técnico')).not.toBeInTheDocument();
    expect(screen.queryByText('Aguardando agendamento')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Mover/ })).not.toBeInTheDocument();
    expect(listarMembros).not.toHaveBeenCalled();
  });

  it('?visao=dia abre direto no dia', async () => {
    renderizarComRotas(<Agenda />, '/agenda', { rota: '/agenda?visao=dia' });
    expect(await screen.findByRole('list', { name: 'calendário timeGridDay' })).toBeInTheDocument();
  });
});
