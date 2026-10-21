// Chaves do cache do TanStack Query, num só lugar para invalidar sem errar o nome.
export const chaves = {
  minhasOrganizacoes: (usuarioId: string) => ['minhas-organizacoes', usuarioId] as const,
  clientes: (organizacaoId: string) => ['clientes', organizacaoId] as const,
  cliente: (id: string) => ['cliente', id] as const,
  locaisDoCliente: (clienteId: string) => ['locais', 'cliente', clienteId] as const,
  locais: (organizacaoId: string) => ['locais', organizacaoId] as const,
  equipamentos: (organizacaoId: string) => ['equipamentos', organizacaoId] as const,
  equipamento: (id: string) => ['equipamento', id] as const,
  membros: (organizacaoId: string) => ['membros', organizacaoId] as const,
  ordens: (organizacaoId: string) => ['ordens', organizacaoId] as const,
  ordem: (id: string) => ['ordem', id] as const,
  eventosDaOrdem: (id: string) => ['ordem', id, 'eventos'] as const,
  execucao: (id: string) => ['ordem', id, 'execucao'] as const,
  historicoEquipamento: (id: string) => ['historico', 'equipamento', id] as const,
  historicoCliente: (id: string) => ['historico', 'cliente', id] as const,
  /** Endereços temporários das fotos (mudam quando entra ou sai uma foto). */
  enderecosFotos: (ordemId: string, caminhos: string[]) =>
    ['ordem', ordemId, 'fotos', caminhos.join('|')] as const,
};
