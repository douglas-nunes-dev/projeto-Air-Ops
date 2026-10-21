import { useEffect, useState } from 'react';
import { LOCAL_PADRAO, type Coordenadas } from '@/domain/clima/tipos';

export type Localizacao = {
  coordenadas: Coordenadas;
  /** false = o navegador não informou (negou, não tem GPS ou demorou); usa o local padrão. */
  doAparelho: boolean;
};

const PADRAO: Localizacao = {
  coordenadas: { latitude: LOCAL_PADRAO.latitude, longitude: LOCAL_PADRAO.longitude },
  doAparelho: false,
};

/**
 * Localização do computador, pedida ao navegador (ele pergunta à pessoa na primeira vez).
 * Enquanto não responde, ou se for negada, fica `null` / o local padrão.
 */
export function useLocalizacao(): Localizacao | null {
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(() =>
    'geolocation' in navigator ? null : PADRAO,
  );

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (posicao) =>
        setLocalizacao({
          coordenadas: { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude },
          doAparelho: true,
        }),
      () => setLocalizacao(PADRAO),
      // Precisão baixa basta para o clima; reaproveita a posição por até 30 minutos.
      { enableHighAccuracy: false, maximumAge: 30 * 60_000, timeout: 10_000 },
    );
  }, []);

  return localizacao;
}
