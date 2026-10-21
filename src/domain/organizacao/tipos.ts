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
};

// Mesma regra do RLS (seção 11). Aqui serve só para esconder botões;
// quem garante de verdade é o banco.
export function podeEditarCadastros(papeis: Papel[]): boolean {
  return papeis.includes('admin') || papeis.includes('gestor');
}
