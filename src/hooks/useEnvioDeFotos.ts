import { useEffect } from 'react';
import { enviarFotosPendentes } from '@/services/storageService';

const INTERVALO_MS = 30_000;

/** Envia a fila de fotos ao abrir o app, quando o sinal volta e de tempos em tempos. */
export function useEnvioDeFotos(): void {
  useEffect(() => {
    const tentar = () => {
      if (navigator.onLine) void enviarFotosPendentes().catch(() => undefined);
    };
    tentar();
    window.addEventListener('online', tentar);
    const timer = window.setInterval(tentar, INTERVALO_MS);
    return () => {
      window.removeEventListener('online', tentar);
      window.clearInterval(timer);
    };
  }, []);
}
