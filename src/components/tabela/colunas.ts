import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

// Recursos do TanStack Table v9 usados nas listas: busca, ordenação e paginação no navegador.
// As listas do MVP são pequenas (centenas de linhas), então não vale paginar no servidor.
export const recursosTabela = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

export type Recursos = typeof recursosTabela;

export function criarColunas<TDado extends RowData>() {
  return createColumnHelper<Recursos, TDado>();
}

export type ColunaTabela<TDado extends RowData> = ColumnDef<Recursos, TDado>;
