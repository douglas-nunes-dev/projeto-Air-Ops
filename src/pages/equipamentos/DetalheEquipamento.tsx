import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, ClipboardPlus, Pencil } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { CabecalhoPagina } from '@/components/pagina/CabecalhoPagina';
import { ConfirmarAcao } from '@/components/pagina/ConfirmarAcao';
import { CarregandoLista, ErroConsulta } from '@/components/pagina/EstadosConsulta';
import { InfoItem } from '@/components/pagina/InfoItem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HistoricoDoEquipamento } from '@/components/historico/LinhaDoTempo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatarCapacidade,
  ROTULOS_TIPO_EQUIPAMENTO,
  rotuloPeriodicidade,
  type Equipamento,
} from '@/domain/equipamento/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataSimples } from '@/lib/texto';
import {
  arquivarEquipamento,
  buscarEquipamento,
  reativarEquipamento,
} from '@/services/equipamentoService';
import { NaoEncontrado } from '../NaoEncontrado';

export function DetalheEquipamento() {
  const { id = '' } = useParams();
  const organizacao = useOrganizacao();
  const cache = useQueryClient();
  const consulta = useQuery({
    queryKey: chaves.equipamento(id),
    queryFn: () => buscarEquipamento(id),
  });

  async function alternarArquivado(equipamento: Equipamento) {
    try {
      if (equipamento.ativo) await arquivarEquipamento(equipamento.id);
      else await reativarEquipamento(equipamento.id);
      await Promise.all([
        cache.invalidateQueries({ queryKey: chaves.equipamento(equipamento.id) }),
        cache.invalidateQueries({ queryKey: chaves.equipamentos(organizacao.id) }),
      ]);
      toast.success(equipamento.ativo ? 'Equipamento arquivado.' : 'Equipamento reativado.');
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    }
  }

  if (consulta.isPending) return <CarregandoLista linhas={6} />;
  if (consulta.isError) {
    return <ErroConsulta erro={consulta.error} aoTentarDeNovo={() => consulta.refetch()} />;
  }
  const equipamento = consulta.data;
  if (!equipamento) return <NaoEncontrado oQue="Equipamento" voltarPara="/equipamentos" />;

  return (
    <>
      <CabecalhoPagina
        titulo={equipamento.identificacao}
        voltar={{ para: '/equipamentos', rotulo: 'Equipamentos' }}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {ROTULOS_TIPO_EQUIPAMENTO[equipamento.tipo]}
            {equipamento.patrimonio && (
              <Badge variant="outline">Patrimônio {equipamento.patrimonio}</Badge>
            )}
            {!equipamento.ativo && <Badge variant="secondary">Arquivado</Badge>}
          </span>
        }
        acoes={
          <>
            {organizacao.podeAbrirOrdens && equipamento.ativo && (
              <Button asChild>
                <Link to={`/ordens/nova?equipamentoId=${equipamento.id}`}>
                  <ClipboardPlus />
                  Abrir OS
                </Link>
              </Button>
            )}
            {organizacao.podeEditarCadastros && (
              <>
                <Button asChild variant="outline">
                  <Link to={`/equipamentos/${equipamento.id}/editar`}>
                    <Pencil />
                    Editar
                  </Link>
                </Button>
                <ConfirmarAcao
                  gatilho={
                    <Button variant="outline">
                      {equipamento.ativo ? <Archive /> : <ArchiveRestore />}
                      {equipamento.ativo ? 'Arquivar' : 'Reativar'}
                    </Button>
                  }
                  titulo={
                    equipamento.ativo ? 'Arquivar este equipamento?' : 'Reativar este equipamento?'
                  }
                  descricao={
                    equipamento.ativo
                      ? 'Use quando o aparelho for retirado ou trocado. O histórico continua guardado.'
                      : 'Ele volta a aparecer nas listas.'
                  }
                  rotuloConfirmar={equipamento.ativo ? 'Arquivar' : 'Reativar'}
                  aoConfirmar={() => alternarArquivado(equipamento)}
                />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 self-start lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Onde fica</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <InfoItem rotulo="Cliente">
                  <Link
                    to={`/clientes/${equipamento.clienteId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {equipamento.clienteNome}
                  </Link>
                </InfoItem>
                <InfoItem rotulo="Local">{equipamento.localNome}</InfoItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manutenção preventiva</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <InfoItem rotulo="Periodicidade">
                  {rotuloPeriodicidade(equipamento.periodicidadeDias)}
                </InfoItem>
                <InfoItem rotulo="Próxima manutenção">
                  {formatarDataSimples(equipamento.proximaManutencao)}
                </InfoItem>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoItem rotulo="Marca">{equipamento.marca}</InfoItem>
                <InfoItem rotulo="Modelo">{equipamento.modelo}</InfoItem>
                <InfoItem rotulo="Capacidade">
                  {equipamento.capacidadeBtu !== null &&
                    formatarCapacidade(equipamento.capacidadeBtu)}
                </InfoItem>
                <InfoItem rotulo="Número de série">{equipamento.numeroSerie}</InfoItem>
                <InfoItem rotulo="Data de instalação">
                  {formatarDataSimples(equipamento.dataInstalacao)}
                </InfoItem>
                <InfoItem rotulo="Observações">
                  {equipamento.observacoes && (
                    <span className="whitespace-pre-line">{equipamento.observacoes}</span>
                  )}
                </InfoItem>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de atendimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoricoDoEquipamento equipamentoId={equipamento.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
