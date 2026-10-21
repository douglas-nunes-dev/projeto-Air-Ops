import type { Papel } from '@/domain/organizacao/tipos';
import { useOrganizacao } from './useOrganizacao';
import { useSessao } from './useSessao';

/** Quem está usando o app e com quais papéis, para as regras da execução. */
export function usePessoaLogada(): { usuarioId: string; papeis: Papel[] } {
  const { usuario } = useSessao();
  const { papeis } = useOrganizacao();
  return { usuarioId: usuario?.id ?? '', papeis };
}
