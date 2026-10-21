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
import { formatarDocumento } from '@/domain/cliente/documento';
import type { Cliente } from '@/domain/cliente/tipos';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { chaves } from '@/lib/chavesConsulta';
import { formatarTelefone } from '@/lib/texto';
import { listarClientes } from '@/services/clienteService';

const coluna = criarColunas<Cliente>();

const COLUNAS = coluna.columns([
  // O valor da coluna junta nome e documento: a busca acha pelos dois, e a ordem continua pelo nome.
  coluna.accessor((cliente) => `${cliente.nome} ${cliente.documento ?? ''}`, {
    id: 'cliente',
    header: 'Cliente',
    cell: (info) => {
      const cliente = info.row.original;
      return (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-medium">
            {cliente.nome}
            {!cliente.ativo && <Badge variant="secondary">Arquivado</Badge>}
          </div>
          {cliente.documento && (
            <div className="text-xs text-muted-foreground">
              {formatarDocumento(cliente.documento)}
            </div>
          )}
        </div>
      );
    },
  }),
  coluna.accessor('contatoNome', {
    header: 'Contato',
    cell: (info) => {
      const cliente = info.row.original;
      return (
        <div className="space-y-0.5">
          <div>{cliente.contatoNome ?? '—'}</div>
          {cliente.telefone && (
            <div className="text-xs text-muted-foreground">
              {formatarTelefone(cliente.telefone)}
            </div>
          )}
        </div>
      );
    },
  }),
  coluna.accessor('email', {
    header: 'E-mail',
    cell: (info) => info.getValue() ?? '—',
  }),
]);

export function ListaClientes() {
  const organizacao = useOrganizacao();
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const consulta = useQuery({
    queryKey: chaves.clientes(organizacao.id),
    queryFn: () => listarClientes(organizacao.id),
  });

  const clientes = useMemo(
    () => (consulta.data ?? []).filter((cliente) => mostrarArquivados || cliente.ativo),
    [consulta.data, mostrarArquivados],
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao="Quem você atende: empresas, hospitais, residências."
        acoes={
          organizacao.podeEditarCadastros && (
            <Button asChild>
              <Link to="/clientes/novo">
                <Plus />
                Novo cliente
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CampoBusca
          valor={busca}
          aoMudar={setBusca}
          placeholder="Buscar por nome, CNPJ, contato…"
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
          dados={clientes}
          busca={busca}
          aoClicarLinha={(cliente) => navegar(`/clientes/${cliente.id}`)}
          rotuloLinha={(cliente) => `Abrir ${cliente.nome}`}
          colunasSoNoComputador={['email']}
          mensagemVazia={
            busca
              ? 'Nenhum cliente encontrado para essa busca.'
              : 'Nenhum cliente cadastrado ainda.'
          }
        />
      )}
    </>
  );
}
