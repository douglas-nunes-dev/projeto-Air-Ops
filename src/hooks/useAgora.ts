import { useEffect, useState } from 'react';

/** Data e hora atuais, atualizadas a cada `intervaloMs` (padrão: 15 segundos). */
export function useAgora(intervaloMs = 15_000): Date {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), intervaloMs);
    return () => window.clearInterval(timer);
  }, [intervaloMs]);

  return agora;
}
