export const PAPEIS = ['admin', 'gestor', 'tecnico'] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULOS_PAPEL: Record<Papel, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  tecnico: 'Técnico',
};

/** Empresa em que o usuário trabalha, com os papéis dele nela. */
export type OrganizacaoDoUsuario = {
  id: string;
  nome: string;
  papeis: Papel[];
  /** Como a pessoa logada aparece no sistema (nome do perfil ou, se vazio, o e-mail). */
  nomeUsuario: string;
};

// Mesma regra do RLS (seção 11). Aqui serve só para esconder botões;
// quem garante de verdade é o banco.
export function podeEditarCadastros(papeis: Papel[]): boolean {
  return papeis.includes('admin') || papeis.includes('gestor');
}

// Abrir e editar OS: os mesmos papéis que cuidam dos cadastros (seção 11).
export function podeAbrirOrdens(papeis: Papel[]): boolean {
  return papeis.includes('admin') || papeis.includes('gestor');
}

/** Pessoa da empresa, usada para escolher e filtrar técnicos. */
export type MembroOrganizacao = {
  usuarioId: string;
  /** Nome do perfil ou, se estiver vazio, o e-mail. */
  nome: string;
  papeis: Papel[];
  ativo: boolean;
};

export function tecnicosDaEmpresa(membros: MembroOrganizacao[]): MembroOrganizacao[] {
  return membros
    .filter((membro) => membro.papeis.includes('tecnico'))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
