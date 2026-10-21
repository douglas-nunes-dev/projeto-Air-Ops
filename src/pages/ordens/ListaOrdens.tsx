import { useQuery } from '@tanstack/react-query';
import { FilterX, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { EtiquetaPrioridade, EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CampoBusca } from '@/components/pagina/CampoBusca';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { criarColunas } from '@/components/tabela/colunas';
import { TabelaDados } from '@/components/tabela/TabelaDados';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  filtrarOrdens,
  filtroAtivo,
  filtroParaParametros,
  lerFiltro,
  SEM_TECNICO,
  type FiltroOrdens,
} from '@/domain/ordem/filtros';
import {
  formatarNumeroOrdem,
  PRIORIDADES,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  ROTULOS_TIPO_SERVICO,
  STATUS_ORDEM,
  type Ordem,
} from '@/domain/ordem/tipos';
import { tecnicosDaEmpresa } from '@/domain/organizacao/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { formatarDataHora, formatarDia } from '@/lib/texto';
import { listarOrdens } from '@/services/ordemService';
import { listarMembros } from '@/services/organizacaoService';

const coluna = criarColunas<Ordem>();

const ORDEM_PRIORIDADE = { baixa: 0, media: 1, alta: 2, urgente: 3 } as const;

const COLUNAS = coluna.columns([
  // A busca acha pelo número com ou sem "OS" (ex.: "OS 12" ou "12").
  coluna.accessor((ordem) => `${formatarNumeroOrdem(ordem.numero)} ${ordem.numero}`, {
    id: 'numero',
    header: 'Nº',
    sortFn: (a, b) => a.original.numero - b.original.numero,
    cell: (info) => (
      <span className="font-medium whitespace-nowrap">
        {formatarNumeroOrdem(info.row.original.numero)}
      </span>
    ),
  }),
  coluna.accessor(
    (ordem) =>
      [
        ordem.clienteNome,
        ordem.localNome,
        ordem.problema,
        ...ordem.equipamentos.map((equipamento) => equipamento.identificacao),
      ].join(' '),
    {
      id: 'ordem',
      header: 'Cliente / problema',
      cell: (info) => {
        const ordem = info.row.original;
        return (
          <div className="max-w-md space-y-0.5">
            <div className="font-medium">
              {ordem.clienteNome}
              <span className="font-normal text-muted-foreground"> · {ordem.localNome}</span>
            </div>
            <div className="line-clamp-1 text-xs text-muted-foreground">
              {ROTULOS_TIPO_SERVICO[ordem.tipoServico]}: {ordem.problema}
            </div>
          </div>
        );
      },
    },
  ),
  coluna.accessor((ordem) => ROTULOS_PRIORIDADE[ordem.prioridade], {
    id: 'prioridade',
    header: 'Prioridade',
    sortFn: (a, b) =>
      ORDEM_PRIORIDADE[a.original.prioridade] - ORDEM_PRIORIDADE[b.original.prioridade],
    cell: (info) => <EtiquetaPrioridade prioridade={info.row.original.prioridade} />,
  }),
  coluna.accessor((ordem) => ROTULOS_STATUS[ordem.status], {
    id: 'status',
    header: 'Status',
    cell: (info) => <EtiquetaStatus status={info.row.original.status} />,
  }),
  coluna.accessor((ordem) => ordem.tecnicoNome ?? '', {
    id: 'tecnico',
    header: 'Técnico',
    cell: (info) => info.getValue() || <span className="text-muted-foreground">A definir</span>,
  }),
  coluna.accessor((ordem) => (ordem.agendadaPara ? formatarDataHora(ordem.agendadaPara) : ''), {
    id: 'agendadaPara',
    header: 'Agendada para',
    sortFn: (a, b) =>
      (a.original.agendadaPara ?? '9999').localeCompare(b.original.agendadaPara ?? '9999'),
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  coluna.accessor((ordem) => formatarDia(ordem.criadoEm), {
    id: 'abertaEm',
    header: 'Aberta em',
    sortFn: (a, b) => a.original.criadoEm.localeCompare(b.original.criadoEm),
  }),
]);

const CLASSE_SELECAO =
  'h-9 w-full rounded-md border border-input bg-background px-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm';

export function ListaOrdens() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [busca, setBusca] = useState('');
  // Os filtros ficam no endereço: dá para voltar, recarregar e mandar o link já filtrado.
  const filtro = lerFiltro(parametros);

  const consulta = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });
  // O técnico só vê as OS dele: o filtro por técnico serve para admin e gestor.
  const membros = useQuery({
    queryKey: chaves.membros(organizacao.id),
    queryFn: () => listarMembros(organizacao.id),
    enabled: organizacao.podeAbrirOrdens,
  });
  const tecnicos = tecnicosDaEmpresa(membros.data ?? []);

  // O texto do endereço só muda quando o filtro muda: evita refiltrar (e voltar à página 1) à toa.
  const enderecoFiltro = parametros.toString();
  const ordens = useMemo(
    () => filtrarOrdens(consulta.data ?? [], lerFiltro(new URLSearchParams(enderecoFiltro))),
    [consulta.data, enderecoFiltro],
  );

  function mudarFiltro(mudanca: Partial<FiltroOrdens>) {
    setParametros(filtroParaParametros({ ...filtro, ...mudanca }), { replace: true });
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Ordens de serviço"
        descricao="Pedidos de atendimento, do registro à conclusão."
        acoes={
          organizacao.podeAbrirOrdens && (
            <Button asChild>
              <Link to="/ordens/nova">
                <Plus />
                Nova OS
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 space-y-3 rounded-lg border bg-background p-3">
        <CampoBusca
          valor={busca}
          aoMudar={setBusca}
          placeholder="Buscar por número, cliente, problema…"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="filtro-situacao">Situação</Label>
            <select
              id="filtro-situacao"
              className={CLASSE_SELECAO}
              value={filtro.situacao}
              onChange={(evento) =>
                mudarFiltro({ situacao: evento.target.value as FiltroOrdens['situacao'] })
              }
            >
              <option value="em_andamento">Em andamento</option>
              <option value="atrasadas">Atrasadas</option>
              {STATUS_ORDEM.map((status) => (
                <option key={status} value={status}>
                  {ROTULOS_STATUS[status]}
                </option>
              ))}
              <option value="todas">Todas</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-prioridade">Prioridade</Label>
            <select
              id="filtro-prioridade"
              className={CLASSE_SELECAO}
              value={filtro.prioridade}
              onChange={(evento) =>
                mudarFiltro({ prioridade: evento.target.value as FiltroOrdens['prioridade'] })
              }
            >
              <option value="">Todas</option>
              {PRIORIDADES.map((prioridade) => (
                <option key={prioridade} value={prioridade}>
                  {ROTULOS_PRIORIDADE[prioridade]}
                </option>
              ))}
            </select>
          </div>
          {organizacao.podeAbrirOrdens && (
            <div className="space-y-1.5">
              <Label htmlFor="filtro-tecnico">Técnico</Label>
              <select
                id="filtro-tecnico"
                className={CLASSE_SELECAO}
                value={filtro.tecnicoId}
                onChange={(evento) => mudarFiltro({ tecnicoId: evento.target.value })}
              >
                <option value="">Todos</option>
                <option value={SEM_TECNICO}>Sem técnico</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.usuarioId} value={tecnico.usuarioId}>
                    {tecnico.nome}
                    {!tecnico.ativo && ' (inativo)'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="filtro-de">Aberta de</Label>
            <Input
              id="filtro-de"
              type="date"
              className="bg-background"
              value={filtro.abertaDe}
              max={filtro.abertaAte || undefined}
              onChange={(evento) => mudarFiltro({ abertaDe: evento.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtro-ate">Até</Label>
            <Input
              id="filtro-ate"
              type="date"
              className="bg-background"
              value={filtro.abertaAte}
              min={filtro.abertaDe || undefined}
              onChange={(evento) => mudarFiltro({ abertaAte: evento.target.value })}
            />
          </div>
        </div>
        {filtroAtivo(filtro) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParametros(new URLSearchParams(), { replace: true })}
          >
            <FilterX />
            Limpar filtros
          </Button>
        )}
      </div>

      {consulta.isPending ? (
        <CarregandoLista />
      ) : consulta.isError ? (
        <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />
      ) : (
        <TabelaDados
          colunas={COLUNAS}
          dados={ordens}
          busca={busca}
          aoClicarLinha={(ordem) => navegar(`/ordens/${ordem.id}`)}
          rotuloLinha={(ordem) => `Abrir ${formatarNumeroOrdem(ordem.numero)}`}
          colunasSoNoComputador={['prioridade', 'tecnico', 'agendadaPara', 'abertaEm']}
          mensagemVazia={
            busca || filtroAtivo(filtro)
              ? 'Nenhuma OS encontrada com esses filtros.'
              : 'Nenhuma OS em andamento.'
          }
        />
      )}
    </>
  );
}
