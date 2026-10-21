import {
  useTable,
  type PaginationState,
  type Row,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { normalizarParaBusca } from '@/lib/texto';
import { recursosTabela, type ColunaTabela, type Recursos } from './colunas';

const LINHAS_POR_PAGINA = 20;

function buscaSemAcento<TDado extends RowData>(
  linha: Row<Recursos, TDado>,
  colunaId: string,
  busca: string,
): boolean {
  const valor = linha.getValue(colunaId);
  if (valor === null || valor === undefined) return false;
  return normalizarParaBusca(String(valor)).includes(normalizarParaBusca(busca));
}

type TabelaDadosProps<TDado extends RowData> = {
  colunas: ColunaTabela<TDado>[];
  dados: TDado[];
  /** Texto digitado na busca; filtra todas as colunas. */
  busca?: string;
  aoClicarLinha?: (dado: TDado) => void;
  mensagemVazia: ReactNode;
  rotuloLinha?: (dado: TDado) => string;
  /** Colunas secundárias que somem no celular (aparecem a partir de telas médias). */
  colunasSoNoComputador?: string[];
};

const CLASSE_SO_COMPUTADOR = 'hidden md:table-cell';

export function TabelaDados<TDado extends RowData>({
  colunas,
  dados,
  busca = '',
  aoClicarLinha,
  mensagemVazia,
  rotuloLinha,
  colunasSoNoComputador = [],
}: TabelaDadosProps<TDado>) {
  const classeDaColuna = (colunaId: string) =>
    colunasSoNoComputador.includes(colunaId) ? CLASSE_SO_COMPUTADOR : undefined;
  const [ordenacao, setOrdenacao] = useState<SortingState>([]);
  const [paginacao, setPaginacao] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: LINHAS_POR_PAGINA,
  });

  const tabela = useTable({
    features: recursosTabela,
    columns: colunas,
    data: dados,
    globalFilterFn: buscaSemAcento,
    state: { globalFilter: busca, sorting: ordenacao, pagination: paginacao },
    onSortingChange: setOrdenacao,
    onPaginationChange: setPaginacao,
    autoResetPageIndex: true,
  });

  const linhas = tabela.getRowModel().rows;
  const totalFiltrado = tabela.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {tabela.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((cabecalho) => {
                  const sentido = cabecalho.column.getIsSorted();
                  const IconeOrdem =
                    sentido === 'asc' ? ArrowUp : sentido === 'desc' ? ArrowDown : ArrowUpDown;
                  return (
                    <TableHead key={cabecalho.id} className={classeDaColuna(cabecalho.column.id)}>
                      {cabecalho.isPlaceholder ? null : cabecalho.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={cabecalho.column.getToggleSortingHandler()}
                        >
                          <tabela.FlexRender header={cabecalho} />
                          <IconeOrdem className="size-3.5 opacity-50" aria-hidden />
                        </button>
                      ) : (
                        <tabela.FlexRender header={cabecalho} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {linhas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colunas.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {mensagemVazia}
                </TableCell>
              </TableRow>
            ) : (
              linhas.map((linha) => (
                <TableRow
                  key={linha.id}
                  className={aoClicarLinha ? 'cursor-pointer' : undefined}
                  onClick={aoClicarLinha ? () => aoClicarLinha(linha.original) : undefined}
                  aria-label={rotuloLinha?.(linha.original)}
                >
                  {linha.getAllCells().map((celula) => (
                    <TableCell key={celula.id} className={classeDaColuna(celula.column.id)}>
                      <tabela.FlexRender cell={celula} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {tabela.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {totalFiltrado} {totalFiltrado === 1 ? 'registro' : 'registros'} · página{' '}
            {paginacao.pageIndex + 1} de {tabela.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabela.previousPage()}
              disabled={!tabela.getCanPreviousPage()}
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabela.nextPage()}
              disabled={!tabela.getCanNextPage()}
            >
              Próxima
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
