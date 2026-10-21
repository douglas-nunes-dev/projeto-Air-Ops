/** Minúsculas e sem acentos, para buscas: "Clínica" e "clinica" ficam iguais. */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function formatarTelefone(telefone: string | null): string {
  if (!telefone) return '';
  if (telefone.length === 11)
    return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
  if (telefone.length === 10)
    return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 6)}-${telefone.slice(6)}`;
  return telefone;
}

export function formatarCep(cep: string | null): string {
  if (!cep || cep.length !== 8) return cep ?? '';
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

/** Data AAAA-MM-DD (sem horário) para DD/MM/AAAA, sem passar por Date (evita erro de fuso). */
export function formatarDataSimples(data: string | null): string {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}
