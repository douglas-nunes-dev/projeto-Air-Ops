import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert, CircleCheck, Clock } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CampoAssinatura, type ControleAssinatura } from '@/components/execucao/CampoAssinatura';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MENSAGENS_PENDENCIA, pendenciasParaConcluir } from '@/domain/ordem/conclusao';
import {
  CONCLUSAO_FORMULARIO_VAZIO,
  ConclusaoFormularioSchema,
  type ConclusaoFormulario,
} from '@/domain/ordem/conclusaoFormulario';
import {
  formatarDuracao,
  podeConcluir,
  progressoChecklist,
  tempoTrabalhado,
  type Execucao,
} from '@/domain/ordem/execucao';
import { formatarNumeroOrdem, type Ordem } from '@/domain/ordem/tipos';
import { useAgora } from '@/hooks/useAgora';
import { useFotosPendentes } from '@/hooks/useFotosPendentes';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { usePessoaLogada } from '@/hooks/usePessoaLogada';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { concluirAtendimento } from '@/services/conclusaoService';
import { buscarExecucao } from '@/services/execucaoService';
import { buscarOrdem, listarEventosDaOrdem } from '@/services/ordemService';
import { NaoEncontrado } from '../NaoEncontrado';

type Erros = Partial<Record<keyof ConclusaoFormulario | 'geral', string>>;

// Conclusão no celular (etapa 5): revisão, o que falta, assinatura do cliente e "Concluir".
export function ConcluirOrdem() {
  const { id = '' } = useParams();
  const ordem = useQuery({ queryKey: chaves.ordem(id), queryFn: () => buscarOrdem(id) });
  const execucao = useQuery({
    queryKey: chaves.execucao(id),
    queryFn: () => buscarExecucao(id),
  });

  if (ordem.isPending || execucao.isPending) return <CarregandoLista linhas={5} />;
  if (ordem.isError)
    return <ErroConsulta erro={ordem.error} aoTentarDeNovo={() => ordem.refetch()} />;
  if (execucao.isError) {
    return <ErroConsulta erro={execucao.error} aoTentarDeNovo={() => execucao.refetch()} />;
  }
  if (!ordem.data) {
    return <NaoEncontrado oQue="Ordem de serviço" voltarPara="/campo/ordens" feminino />;
  }
  return <TelaConclusao ordem={ordem.data} execucao={execucao.data} />;
}

function TelaConclusao({ ordem, execucao }: { ordem: Ordem; execucao: Execucao }) {
  const pessoa = usePessoaLogada();
  const organizacao = useOrganizacao();
  const cache = useQueryClient();
  const navegar = useNavigate();
  const assinatura = useRef<ControleAssinatura>(null);
  const fotosNaFila = useFotosPendentes(ordem.id).length;
  const [formulario, setFormulario] = useState<ConclusaoFormulario>(CONCLUSAO_FORMULARIO_VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);

  const voltar = `/campo/ordens/${ordem.id}`;
  if (!podeConcluir(ordem, pessoa)) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {ordem.status === 'pausada'
            ? 'Retome o atendimento antes de concluir.'
            : 'Só o técnico da OS conclui, com o atendimento em andamento.'}
        </p>
        <Button asChild variant="outline">
          <Link to={voltar}>Voltar para a OS</Link>
        </Button>
      </div>
    );
  }

  const pendencias = pendenciasParaConcluir({
    diagnostico: execucao.anotacoes.diagnostico,
    fotosEnviadas: execucao.fotos.length,
    fotosNaFila,
  });

  function mudar<Campo extends keyof ConclusaoFormulario>(
    campo: Campo,
    valor: ConclusaoFormulario[Campo],
  ) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    setErros((atuais) => ({ ...atuais, [campo]: undefined, geral: undefined }));
  }

  async function aoConcluir(evento: FormEvent) {
    evento.preventDefault();
    const leitura = ConclusaoFormularioSchema.safeParse(formulario);
    if (!leitura.success) {
      const novos: Erros = {};
      for (const problema of leitura.error.issues) {
        novos[problema.path[0] as keyof ConclusaoFormulario] ??= problema.message;
      }
      setErros(novos);
      return;
    }

    setEnviando(true);
    try {
      const imagemAssinatura = formulario.semAssinatura
        ? null
        : ((await assinatura.current?.obterImagem()) ?? null);
      await concluirAtendimento({
        ordem,
        quem: pessoa,
        execucao,
        fotosNaFila,
        formulario,
        imagemAssinatura,
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: chaves.ordem(ordem.id) }),
        cache.invalidateQueries({ queryKey: chaves.ordens(organizacao.id) }),
      ]);
      toast.success(
        `${formatarNumeroOrdem(ordem.numero)} concluída. Envie o relatório ao cliente.`,
      );
      navegar(voltar, { replace: true });
    } catch (erro) {
      setErros({ geral: mensagemDeErro(erro) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoConcluir} noValidate className="space-y-4 pb-4">
      <Link to={voltar} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {formatarNumeroOrdem(ordem.numero)}
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Concluir atendimento</h1>
        <p className="text-sm text-muted-foreground">
          {ordem.clienteNome} · {ordem.localNome}
        </p>
      </div>

      <Revisao ordem={ordem} execucao={execucao} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Antes de concluir</CardTitle>
        </CardHeader>
        <CardContent>
          {pendencias.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CircleCheck className="size-4" aria-hidden />
              Tudo pronto para concluir.
            </p>
          ) : (
            <ul className="space-y-2" aria-label="O que falta">
              {pendencias.map((pendencia) => (
                <li key={pendencia} className="flex items-start gap-2 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {MENSAGENS_PENDENCIA[pendencia]}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assinatura do cliente</CardTitle>
          <CardDescription>Quem acompanhou o serviço confirma o atendimento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!formulario.semAssinatura && (
            <>
              <Field data-invalid={Boolean(erros.assinou)}>
                <CampoAssinatura
                  ref={assinatura}
                  aoMudar={(assinou) => mudar('assinou', assinou)}
                  invalido={Boolean(erros.assinou)}
                />
                {erros.assinou && <FieldError>{erros.assinou}</FieldError>}
              </Field>
              <Field data-invalid={Boolean(erros.nomeAssinante)}>
                <FieldLabel htmlFor="nome-assinante">Nome de quem assinou</FieldLabel>
                <Input
                  id="nome-assinante"
                  className="h-11"
                  autoComplete="off"
                  maxLength={120}
                  value={formulario.nomeAssinante}
                  aria-invalid={Boolean(erros.nomeAssinante)}
                  onChange={(evento) => mudar('nomeAssinante', evento.target.value)}
                />
                {erros.nomeAssinante && <FieldError>{erros.nomeAssinante}</FieldError>}
              </Field>
            </>
          )}

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={formulario.semAssinatura}
              onChange={(evento) => mudar('semAssinatura', evento.target.checked)}
            />
            O cliente não pôde assinar
          </label>

          {formulario.semAssinatura && (
            <Field data-invalid={Boolean(erros.motivoSemAssinatura)}>
              <FieldLabel htmlFor="motivo-sem-assinatura">Por que não há assinatura?</FieldLabel>
              <Textarea
                id="motivo-sem-assinatura"
                rows={2}
                maxLength={300}
                placeholder="Ex.: responsável ausente; serviço em área sem acompanhamento"
                value={formulario.motivoSemAssinatura}
                aria-invalid={Boolean(erros.motivoSemAssinatura)}
                onChange={(evento) => mudar('motivoSemAssinatura', evento.target.value)}
              />
              {erros.motivoSemAssinatura && <FieldError>{erros.motivoSemAssinatura}</FieldError>}
            </Field>
          )}
        </CardContent>
      </Card>

      {erros.geral && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erros.geral}
        </p>
      )}

      <Button
        type="submit"
        className="h-14 w-full text-base"
        disabled={enviando || pendencias.length > 0}
      >
        <CircleCheck />
        {enviando ? 'Concluindo…' : 'Concluir OS'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Depois de concluída, a OS não pode mais ser alterada.
      </p>
    </form>
  );
}

function Revisao({ ordem, execucao }: { ordem: Ordem; execucao: Execucao }) {
  const agora = useAgora(30_000);
  const eventos = useQuery({
    queryKey: chaves.eventosDaOrdem(ordem.id),
    queryFn: () => listarEventosDaOrdem(ordem.id),
  });
  const { respondidos, total } = progressoChecklist(execucao.checklist);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revisão</CardTitle>
        <CardDescription>Confira antes de pedir a assinatura.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          {eventos.data && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" aria-hidden />
              <dt className="text-muted-foreground">Tempo trabalhado:</dt>
              <dd className="font-medium tabular-nums">
                {formatarDuracao(tempoTrabalhado(eventos.data, agora))}
              </dd>
            </div>
          )}
          <Linha rotulo="Checklist">
            {total === 0
              ? 'Sem checklist'
              : `${respondidos} de ${total} itens respondidos${respondidos < total ? ' (não obrigatório)' : ''}`}
          </Linha>
          <Linha rotulo="Diagnóstico">{execucao.anotacoes.diagnostico ?? 'Não preenchido'}</Linha>
          <Linha rotulo="Atividades">
            {execucao.atividades.length === 0
              ? 'Nenhuma'
              : execucao.atividades.map((atividade) => atividade.descricao).join('; ')}
          </Linha>
          <Linha rotulo="Materiais">{execucao.anotacoes.materiais ?? 'Não informado'}</Linha>
          <Linha rotulo="Fotos">{`${execucao.fotos.length} enviada(s)`}</Linha>
        </dl>
      </CardContent>
    </Card>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}
