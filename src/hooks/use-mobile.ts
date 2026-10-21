import { useSyncExternalStore } from 'react';

// Gerado pelo shadcn (usado pelo menu lateral) e reescrito com useSyncExternalStore,
// que é a forma recomendada pelo React para acompanhar algo de fora dele (o tamanho da tela).
const CONSULTA_CELULAR = '(max-width: 767px)';

function observarTela(aoMudar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_CELULAR);
  consulta.addEventListener('change', aoMudar);
  return () => consulta.removeEventListener('change', aoMudar);
}

function ehCelular(): boolean {
  return window.matchMedia(CONSULTA_CELULAR).matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(observarTela, ehCelular, () => false);
}
