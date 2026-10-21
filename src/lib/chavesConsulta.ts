// Chaves do cache do TanStack Query, num só lugar para invalidar sem errar o nome.
export const chaves = {
  minhasOrganizacoes: (usuarioId: string) => ['minhas-organizacoes', usuarioId] as const,
  clientes: (organizacaoId: string) => ['clientes', organizacaoId] as const,
  cliente: (id: string) => ['cliente', id] as const,
  locaisDoCliente: (clienteId: string) => ['locais', 'cliente', clienteId] as const,
  locais: (organizacaoId: string) => ['locais', organizacaoId] as const,
  equipamentos: (organizacaoId: string) => ['equipamentos', organizacaoId] as const,
  equipamento: (id: string) => ['equipamento', id] as const,
};
