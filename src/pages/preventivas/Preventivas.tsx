import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, ClipboardPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { descreverSituacao, diaNoFuso } from '@/domain/equipamento/preventiva';
import {
  agruparPorLocal,
  listarPreventivasPendentes,
  ordemPreventivaDoLocal,
  type GrupoPorLocal,
  type PreventivaPendente,
} from '@/domain/equipamento/preventivasPendentes';
import { rotuloPeriodicidade } from '@/domain/equipamento/tipos';
import { formatarNumeroOrdem } from '@/domain/ordem/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataSimples } from '@/lib/texto';
import { cn } from '@/lib/utils';
import { listarEquipamentos } from '@/services/equipamentoService';
import { abrirOrdem, listarOrdens } from '@/services/ordemService';

// Preventivas vencendo (etapa 8): vencidas e a vencer em 30 dias. Admin e gestor marcam os
// equipamentos e geram uma OS de preventiva por local (decisão da etapa 8).
export function Preventivas() {
  const organizacao = useOrganizacao();
  const equipamentos = useQuery({
    queryKey: chaves.equipamentos(organizacao.id),
    queryFn: () => listarEquipamentos(organizacao.id),
  });
  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });

  const cabecalho = (
    <CabecalhoPagina
      titulo="Preventivas"
      descricao="Vencidas e a vencer nos próximos 30 dias, conforme a periodicidade de cada equipamento."
    />
  );
  if (equipamentos.isPending || ordens.isPending) {
    return (
      <>
        {cabecalho}
        <CarregandoLista linhas={5} />
      </>
    );
  }
  const falha = equipamentos.error ?? ordens.error;
  if (falha) {
    return (
      <>
        {cabecalho}
        <ErroConsulta
          erro={falha}
          aoTentarDeNovo={() => void Promise.all([equipamentos.refetch(), ordens.refetch()])}
        />
      </>
    );
  }

  const pendentes = listarPreventivasPendentes(
    equipamentos.data ?? [],
    ordens.data ?? [],
    diaNoFuso(new Date()),
  );
  return (
    <>
      {cabecalho}
      <ListaPreventivas pendentes={pendentes} />
    </>
  );
}

function ListaPreventivas({ pendentes }: { pendentes: PreventivaPendente[] }) {
  const organizacao = useOrganizacao();
  const cache = useQueryClient();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);

  if (pendentes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <CalendarCheck className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Nenhuma preventiva vencida ou vencendo nos próximos 30 dias.
        </p>
      </div>
    );
  }

  const grupos = agruparPorLocal(pendentes);
  const vencidas = pendentes.filter((pendente) => pendente.situacao.tipo === 'vencida').length;
  const selecionaveis = (grupo: GrupoPorLocal) =>
    grupo.itens.filter((item) => !item.ordemAberta).map((item) => item.equipamento.id);

  function alternar(ids: string[], marcar: boolean) {
    setMarcados((atuais) => {
      const novos = new Set(atuais);
      for (const id of ids) {
        if (marcar) novos.add(id);
        else novos.delete(id);
      }
      return novos;
    });
  }

  const gruposMarcados = agruparPorLocal(
    pendentes.filter((pendente) => marcados.has(pendente.equipamento.id)),
  );

  async function gerar() {
    setGerando(true);
    const abertas: string[] = [];
    try {
      // Uma OS por local; se uma falhar, as já abertas ficam e a mensagem diz qual parou.
      for (const grupo of gruposMarcados) {
        const ordem = await abrirOrdem(organizacao.id, ordemPreventivaDoLocal(grupo));
        abertas.push(formatarNumeroOrdem(ordem.numero));
      }
      toast.success(
        abertas.length === 1
          ? `${abertas[0]} de preventiva aberta. Agende o técnico.`
          : `${abertas.length} OS de preventiva abertas (${abertas.join(', ')}). Agende os técnicos.`,
      );
    } catch (erro) {
      toast.error(
        `${abertas.length > 0 ? `Abertas: ${abertas.join(', ')}. ` : ''}${mensagemDeErro(erro)}`,
      );
    } finally {
      setMarcados(new Set());
      setGerando(false);
      await cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) });
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <p className="flex flex-wrap gap-2 text-sm">
        <Badge
          variant="secondary"
          className={cn(vencidas > 0 && 'bg-destructive/10 text-destructive')}
        >
          {vencidas === 1 ? '1 vencida' : `${vencidas} vencidas`}
        </Badge>
        <Badge variant="secondary">
          {pendentes.length - vencidas === 1
            ? '1 vence em até 30 dias'
            : `${pendentes.length - vencidas} vencem em até 30 dias`}
        </Badge>
      </p>

      {grupos.map((grupo) => {
        const ids = selecionaveis(grupo);
        const todosMarcados = ids.length > 0 && ids.every((id) => marcados.has(id));
        return (
          <Card key={grupo.localId}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">
                {grupo.clienteNome} · {grupo.localNome}
              </CardTitle>
              {organizacao.podeAbrirOrdens && ids.length > 1 && (
                <label className="flex items-center gap-2 text-sm font-normal">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={todosMarcados}
                    onChange={(evento) => alternar(ids, evento.target.checked)}
                  />
                  Marcar todos
                </label>
              )}
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {grupo.itens.map((item) => (
                  <LinhaPreventiva
                    key={item.equipamento.id}
                    item={item}
                    podeMarcar={organizacao.podeAbrirOrdens && !item.ordemAberta}
                    marcado={marcados.has(item.equipamento.id)}
                    aoMarcar={(marcar) => alternar([item.equipamento.id], marcar)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      {organizacao.podeAbrirOrdens && marcados.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background p-3 md:left-(--sidebar-width)">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm">
              {marcados.size === 1 ? '1 equipamento' : `${marcados.size} equipamentos`} em{' '}
              {gruposMarcados.length === 1 ? '1 local' : `${gruposMarcados.length} locais`}
            </p>
            <Button disabled={gerando} onClick={gerar}>
              <ClipboardPlus />
              {gerando
                ? 'Abrindo…'
                : gruposMarcados.length === 1
                  ? 'Gerar 1 OS'
                  : `Gerar ${gruposMarcados.length} OS`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinhaPreventiva({
  item,
  podeMarcar,
  marcado,
  aoMarcar,
}: {
  item: PreventivaPendente;
  podeMarcar: boolean;
  marcado: boolean;
  aoMarcar: (marcar: boolean) => void;
}) {
  const { equipamento, situacao, ordemAberta } = item;
  const vencida = situacao.tipo === 'vencida';

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {podeMarcar && (
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          aria-label={`Incluir ${equipamento.identificacao}`}
          checked={marcado}
          onChange={(evento) => aoMarcar(evento.target.checked)}
        />
      )}
      <div className="min-w-0 flex-1">
        <Link
          to={`/equipamentos/${equipamento.id}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {equipamento.identificacao}
        </Link>
        <p className="text-xs text-muted-foreground">
          {rotuloPeriodicidade(equipamento.periodicidadeDias)} · vence em{' '}
          {formatarDataSimples(situacao.vencimento)}
        </p>
      </div>
      {ordemAberta ? (
        <Link
          to={`/ordens/${ordemAberta.id}`}
          className="shrink-0 text-xs text-primary underline-offset-4 hover:underline"
        >
          {formatarNumeroOrdem(ordemAberta.numero)} já aberta
        </Link>
      ) : (
        <Badge
          variant="secondary"
          className={cn(
            'shrink-0',
            vencida
              ? 'bg-destructive/10 text-destructive'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
          )}
        >
          {descreverSituacao(situacao)}
        </Badge>
      )}
    </li>
  );
}
