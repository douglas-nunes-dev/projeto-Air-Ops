import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { aplicarErroNoFormulario } from '@/components/formulario/aplicarErro';
import { CampoSelecao } from '@/components/formulario/CampoSelecao';
import { CampoTexto } from '@/components/formulario/CampoTexto';
import { ErroFormulario } from '@/components/formulario/ErroFormulario';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import {
  AgendamentoFormularioSchema,
  agendamentoParaFormulario,
  conflitosDeHorario,
  DURACOES,
  type AgendamentoFormulario,
  type DadosAgendamento,
} from '@/domain/ordem/planejamento';
import { formatarNumeroOrdem, type Ordem } from '@/domain/ordem/tipos';
import { tecnicosDaEmpresa, type MembroOrganizacao } from '@/domain/organizacao/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { formatarDataHora } from '@/lib/texto';
import { listarOrdens } from '@/services/ordemService';
import { listarMembros } from '@/services/organizacaoService';

const CAMPOS = ['tecnicoId', 'data', 'hora', 'duracaoMinutos'];

const OPCOES_DURACAO = DURACOES.map((duracao) => ({
  valor: String(duracao.minutos),
  rotulo: duracao.rotulo,
}));

type DialogoAgendarProps = {
  ordem: Ordem;
  aberto: boolean;
  aoMudarAberto: (aberto: boolean) => void;
  aoSalvar: (dados: AgendamentoFormulario) => Promise<void>;
};

// O formulário só existe enquanto o diálogo está aberto: cada abertura começa do agendamento atual.
export function DialogoAgendar({ ordem, aberto, aoMudarAberto, aoSalvar }: DialogoAgendarProps) {
  const reagendar = ordem.status === 'agendada';
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reagendar ? 'Reagendar' : 'Agendar'} {formatarNumeroOrdem(ordem.numero)}
          </DialogTitle>
          <DialogDescription>
            {ordem.clienteNome} · {ordem.localNome}
          </DialogDescription>
        </DialogHeader>
        {aberto && (
          <CarregarTecnicos
            ordem={ordem}
            rotuloSalvar={reagendar ? 'Reagendar' : 'Agendar'}
            aoSalvar={aoSalvar}
            aoCancelar={() => aoMudarAberto(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type FormularioProps = {
  ordem: Ordem;
  rotuloSalvar: string;
  aoSalvar: (dados: AgendamentoFormulario) => Promise<void>;
  aoCancelar: () => void;
};

function CarregarTecnicos(props: FormularioProps) {
  const organizacao = useOrganizacao();
  const membros = useQuery({
    queryKey: chaves.membros(organizacao.id),
    queryFn: () => listarMembros(organizacao.id),
  });

  if (membros.isPending) return <CarregandoLista linhas={3} />;
  if (membros.isError) {
    return <ErroConsulta erro={membros.error} aoTentarDeNovo={() => membros.refetch()} />;
  }
  return <FormularioAgendamento {...props} membros={membros.data} />;
}

function FormularioAgendamento({
  ordem,
  rotuloSalvar,
  aoSalvar,
  aoCancelar,
  membros,
}: FormularioProps & { membros: MembroOrganizacao[] }) {
  const organizacao = useOrganizacao();
  const formulario = useForm<AgendamentoFormulario, unknown, DadosAgendamento>({
    resolver: zodResolver(AgendamentoFormularioSchema),
    defaultValues: agendamentoParaFormulario(ordem, new Date()),
  });
  const { isSubmitting, errors } = formulario.formState;
  // Só a lista que já está no cache, para avisar de horário ocupado sem nova consulta.
  const ordens = useQuery({
    queryKey: chaves.ordens(organizacao.id),
    queryFn: () => listarOrdens(organizacao.id),
  });
  const [tecnicoId, data, hora, duracao] = useWatch({
    control: formulario.control,
    name: ['tecnicoId', 'data', 'hora', 'duracaoMinutos'],
  });

  // Inativos ficam de fora, menos o técnico que já está na OS.
  const opcoesTecnicos = tecnicosDaEmpresa(membros)
    .filter((membro) => membro.ativo || membro.usuarioId === ordem.tecnicoId)
    .map((membro) => ({ valor: membro.usuarioId, rotulo: membro.nome }));

  const inicio = data && hora ? new Date(`${data}T${hora}:00`) : null;
  const conflitos =
    tecnicoId && inicio && !Number.isNaN(inicio.getTime())
      ? conflitosDeHorario(ordens.data ?? [], {
          ordemId: ordem.id,
          tecnicoId,
          inicio,
          duracaoMinutos: Number(duracao),
        })
      : [];

  async function enviar() {
    try {
      await aoSalvar(formulario.getValues());
    } catch (erro) {
      aplicarErroNoFormulario(formulario, erro, CAMPOS);
    }
  }

  return (
    <form onSubmit={formulario.handleSubmit(enviar)} noValidate>
      <FieldGroup>
        <ErroFormulario mensagem={errors.root?.message} />
        <CampoSelecao
          control={formulario.control}
          name="tecnicoId"
          rotulo="Técnico"
          opcoes={opcoesTecnicos}
          opcaoVazia="Escolha o técnico"
          descricao={
            opcoesTecnicos.length === 0
              ? 'Nenhuma pessoa da empresa tem o papel de técnico.'
              : undefined
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <CampoTexto control={formulario.control} name="data" rotulo="Data" type="date" />
          <CampoTexto control={formulario.control} name="hora" rotulo="Hora" type="time" />
        </div>
        <CampoSelecao
          control={formulario.control}
          name="duracaoMinutos"
          rotulo="Duração prevista"
          opcoes={OPCOES_DURACAO}
        />
        {conflitos.length > 0 && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">O técnico já tem atendimento nesse horário:</p>
              <ul className="mt-1 space-y-0.5">
                {conflitos.map((outra) => (
                  <li key={outra.id}>
                    {formatarNumeroOrdem(outra.numero)} · {formatarDataHora(outra.agendadaPara)} ·{' '}
                    {outra.clienteNome}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </FieldGroup>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Voltar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : rotuloSalvar}
        </Button>
      </DialogFooter>
    </form>
  );
}
