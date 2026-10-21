import { useQuery } from '@tanstack/react-query';
import { Camera, CircleAlert, History } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { EtiquetaStatus } from '@/components/ordem/EtiquetasOrdem';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import {
  dataDoAtendimento,
  podeAbrirOrdemDoHistorico,
  resumirHistorico,
  type AtendimentoHistorico,
} from '@/domain/historico/historico';
import { formatarNumeroOrdem, ROTULOS_TIPO_SERVICO } from '@/domain/ordem/tipos';
import { usePessoaLogada } from '@/hooks/usePessoaLogada';
import { chaves } from '@/lib/chavesConsulta';
import { formatarDia } from '@/lib/texto';
import { cn } from '@/lib/utils';
import {
  listarHistoricoDoCliente,
  listarHistoricoDoEquipamento,
} from '@/services/historicoService';

// Linha do tempo de atendimentos (etapa 6): resumo no topo e um item por OS, do mais recente
// para o mais antigo.

export function HistoricoDoEquipamento({ equipamentoId }: { equipamentoId: string }) {
  const consulta = useQuery({
    queryKey: chaves.historicoEquipamento(equipamentoId),
    queryFn: () => listarHistoricoDoEquipamento(equipamentoId),
  });
  if (consulta.isPending) return <CarregandoLista linhas={3} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  return (
    <LinhaDoTempo
      atendimentos={consulta.data}
      vazio="Este equipamento ainda não teve atendimentos."
    />
  );
}

const TODOS_OS_LOCAIS = '';

export function HistoricoDoCliente({ clienteId }: { clienteId: string }) {
  const [local, setLocal] = useState(TODOS_OS_LOCAIS);
  const consulta = useQuery({
    queryKey: chaves.historicoCliente(clienteId),
    queryFn: () => listarHistoricoDoCliente(clienteId),
  });
  if (consulta.isPending) return <CarregandoLista linhas={3} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }

  const locais = [...new Set(consulta.data.map((atendimento) => atendimento.localNome))].sort(
    (a, b) => a.localeCompare(b, 'pt-BR'),
  );
  const filtrados =
    local === TODOS_OS_LOCAIS
      ? consulta.data
      : consulta.data.filter((atendimento) => atendimento.localNome === local);

  return (
    <div className="space-y-4">
      {locais.length > 1 && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Local</span>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm"
            value={local}
            onChange={(evento) => setLocal(evento.target.value)}
          >
            <option value={TODOS_OS_LOCAIS}>Todos os locais</option>
            {locais.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <LinhaDoTempo
        atendimentos={filtrados}
        mostrarLocal={local === TODOS_OS_LOCAIS && locais.length > 1}
        vazio="Nenhum atendimento para este cliente."
      />
    </div>
  );
}

function LinhaDoTempo({
  atendimentos,
  mostrarLocal = false,
  vazio,
}: {
  atendimentos: AtendimentoHistorico[];
  mostrarLocal?: boolean;
  vazio: string;
}) {
  if (atendimentos.length === 0) {
    return (
      <p className="flex items-center gap-3 text-sm text-muted-foreground">
        <History className="size-5 shrink-0" aria-hidden />
        {vazio}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ResumoDoHistorico atendimentos={atendimentos} />
      <ol className="space-y-4 border-l pl-4">
        {atendimentos.map((atendimento) => (
          <ItemDoHistorico
            key={atendimento.ordemId}
            atendimento={atendimento}
            mostrarLocal={mostrarLocal}
          />
        ))}
      </ol>
    </div>
  );
}

function ResumoDoHistorico({ atendimentos }: { atendimentos: AtendimentoHistorico[] }) {
  const { total, ultimoConcluido, corretivasUltimos12Meses } = resumirHistorico(
    atendimentos,
    new Date(),
  );
  // Três ou mais corretivas em um ano: vale olhar o aparelho com atenção.
  const alerta = corretivasUltimos12Meses >= 3;

  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      <Indicador rotulo="Atendimentos" valor={String(total)} />
      <Indicador
        rotulo="Último concluído"
        valor={ultimoConcluido?.concluidaEm ? formatarDia(ultimoConcluido.concluidaEm) : '—'}
      />
      <Indicador
        rotulo="Corretivas (12 meses)"
        valor={String(corretivasUltimos12Meses)}
        alerta={alerta}
      />
    </dl>
  );
}

function Indicador({
  rotulo,
  valor,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-2',
        alerta && 'border-destructive/40 bg-destructive/5 text-destructive',
      )}
    >
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-base font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}

function ItemDoHistorico({
  atendimento,
  mostrarLocal,
}: {
  atendimento: AtendimentoHistorico;
  mostrarLocal: boolean;
}) {
  const pessoa = usePessoaLogada();
  const numero = formatarNumeroOrdem(atendimento.numero);

  return (
    <li className="relative space-y-1">
      <span
        className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary"
        aria-hidden
      />
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums">
          {formatarDia(dataDoAtendimento(atendimento))}
        </span>
        {podeAbrirOrdemDoHistorico(atendimento, pessoa) ? (
          <Link
            to={`/ordens/${atendimento.ordemId}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {numero}
          </Link>
        ) : (
          <span className="text-muted-foreground">{numero}</span>
        )}
        <span className="text-muted-foreground">
          {ROTULOS_TIPO_SERVICO[atendimento.tipoServico]}
        </span>
        <EtiquetaStatus status={atendimento.status} />
      </p>
      <p className="text-xs text-muted-foreground">
        {[mostrarLocal && atendimento.localNome, atendimento.tecnicoNome ?? 'Sem técnico']
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p className="line-clamp-2 text-sm">
        {atendimento.diagnostico ? (
          atendimento.diagnostico
        ) : (
          <span className="text-muted-foreground">Problema: {atendimento.problema}</span>
        )}
      </p>
      {(atendimento.naoConformes > 0 || atendimento.fotos > 0) && (
        <p className="flex flex-wrap gap-3 text-xs">
          {atendimento.naoConformes > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <CircleAlert className="size-3.5" aria-hidden />
              {atendimento.naoConformes === 1
                ? '1 não conformidade'
                : `${atendimento.naoConformes} não conformidades`}
            </span>
          )}
          {atendimento.fotos > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Camera className="size-3.5" aria-hidden />
              {atendimento.fotos === 1 ? '1 foto' : `${atendimento.fotos} fotos`}
            </span>
          )}
        </p>
      )}
    </li>
  );
}
