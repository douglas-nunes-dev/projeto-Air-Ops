import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CampoBusca } from '@/components/pagina/CampoBusca';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { criarColunas } from '@/components/tabela/colunas';
import { TabelaDados } from '@/components/tabela/TabelaDados';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  formatarCapacidade,
  ROTULOS_TIPO_EQUIPAMENTO,
  rotuloPeriodicidade,
  type Equipamento,
} from '@/domain/equipamento/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { listarEquipamentos } from '@/services/equipamentoService';

const coluna = criarColunas<Equipamento>();

const COLUNAS = coluna.columns([
  // Junta identificação, patrimônio, marca, modelo e série: a busca acha por qualquer um.
  coluna.accessor(
    (equipamento) =>
      [
        equipamento.identificacao,
        equipamento.patrimonio,
        equipamento.marca,
        equipamento.modelo,
        equipamento.numeroSerie,
      ]
        .filter(Boolean)
        .join(' '),
    {
      id: 'equipamento',
      header: 'Equipamento',
      cell: (info) => {
        const equipamento = info.row.original;
        const detalhes = [equipamento.marca, equipamento.modelo].filter(Boolean).join(' ');
        return (
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              {equipamento.identificacao}
              {equipamento.patrimonio && <Badge variant="outline">{equipamento.patrimonio}</Badge>}
              {!equipamento.ativo && <Badge variant="secondary">Arquivado</Badge>}
            </div>
            {detalhes && <div className="text-xs text-muted-foreground">{detalhes}</div>}
          </div>
        );
      },
    },
  ),
  coluna.accessor((equipamento) => ROTULOS_TIPO_EQUIPAMENTO[equipamento.tipo], {
    id: 'tipo',
    header: 'Tipo',
  }),
  coluna.accessor((equipamento) => `${equipamento.clienteNome} ${equipamento.localNome}`, {
    id: 'onde',
    header: 'Cliente / local',
    cell: (info) => (
      <div className="space-y-0.5">
        <div>{info.row.original.clienteNome}</div>
        <div className="text-xs text-muted-foreground">{info.row.original.localNome}</div>
      </div>
    ),
  }),
  coluna.accessor('capacidadeBtu', {
    header: 'Capacidade',
    cell: (info) => formatarCapacidade(info.getValue()),
  }),
  coluna.accessor((equipamento) => rotuloPeriodicidade(equipamento.periodicidadeDias), {
    id: 'periodicidade',
    header: 'Preventiva',
  }),
]);

export function ListaEquipamentos() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const consulta = useQuery({
    queryKey: chaves.equipamentos(organizacao.id),
    queryFn: () => listarEquipamentos(organizacao.id),
  });

  const equipamentos = useMemo(
    () => (consulta.data ?? []).filter((equipamento) => mostrarArquivados || equipamento.ativo),
    [consulta.data, mostrarArquivados],
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Equipamentos"
        descricao="Aparelhos atendidos, com dados técnicos e periodicidade da preventiva."
        acoes={
          organizacao.podeEditarCadastros && (
            <Button asChild>
              <Link to="/equipamentos/novo">
                <Plus />
                Novo equipamento
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CampoBusca
          valor={busca}
          aoMudar={setBusca}
          placeholder="Buscar por nome, cliente, patrimônio…"
        />
        <div className="flex items-center gap-2">
          <input
            id="mostrar-arquivados"
            type="checkbox"
            className="size-4 accent-primary"
            checked={mostrarArquivados}
            onChange={(evento) => setMostrarArquivados(evento.target.checked)}
          />
          <Label htmlFor="mostrar-arquivados" className="font-normal">
            Mostrar arquivados
          </Label>
        </div>
      </div>

      {consulta.isPending ? (
        <CarregandoLista />
      ) : consulta.isError ? (
        <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />
      ) : (
        <TabelaDados
          colunas={COLUNAS}
          dados={equipamentos}
          busca={busca}
          aoClicarLinha={(equipamento) => navegar(`/equipamentos/${equipamento.id}`)}
          rotuloLinha={(equipamento) => `Abrir ${equipamento.identificacao}`}
          colunasSoNoComputador={['tipo', 'capacidadeBtu', 'periodicidade']}
          mensagemVazia={
            busca
              ? 'Nenhum equipamento encontrado para essa busca.'
              : 'Nenhum equipamento cadastrado ainda.'
          }
        />
      )}
    </>
  );
}
