export type Coordenadas = {
  latitude: number;
  longitude: number;
};

/** Usada quando o navegador não informa a localização: Passos (MG), cidade do piloto. */
export const LOCAL_PADRAO: Coordenadas & { cidade: string } = {
  latitude: -20.72,
  longitude: -46.61,
  cidade: 'Passos/MG',
};

export type CategoriaTempo =
  'limpo' | 'poucas_nuvens' | 'nublado' | 'neblina' | 'garoa' | 'chuva' | 'neve' | 'trovoada';

export type Clima = {
  /** Graus Celsius, já arredondado. */
  temperatura: number;
  /** Código do tempo no padrão da Organização Meteorológica Mundial (WMO). */
  codigo: number;
  ehDia: boolean;
  /** Nome da cidade, quando dá para descobrir. */
  cidade: string | null;
};

type Tempo = { categoria: CategoriaTempo; descricao: string };

// Tabela de códigos WMO usada pela Open-Meteo: https://open-meteo.com/en/docs
export function descreverTempo(codigo: number): Tempo {
  if (codigo === 0) return { categoria: 'limpo', descricao: 'Céu limpo' };
  if (codigo === 1) return { categoria: 'poucas_nuvens', descricao: 'Poucas nuvens' };
  if (codigo === 2) return { categoria: 'poucas_nuvens', descricao: 'Parcialmente nublado' };
  if (codigo === 3) return { categoria: 'nublado', descricao: 'Nublado' };
  if (codigo === 45 || codigo === 48) return { categoria: 'neblina', descricao: 'Neblina' };
  if (codigo >= 51 && codigo <= 57) return { categoria: 'garoa', descricao: 'Garoa' };
  if (codigo >= 61 && codigo <= 67) return { categoria: 'chuva', descricao: 'Chuva' };
  if (codigo >= 71 && codigo <= 77) return { categoria: 'neve', descricao: 'Neve' };
  if (codigo >= 80 && codigo <= 82) return { categoria: 'chuva', descricao: 'Pancadas de chuva' };
  if (codigo === 85 || codigo === 86) return { categoria: 'neve', descricao: 'Neve' };
  if (codigo === 95) return { categoria: 'trovoada', descricao: 'Trovoada' };
  if (codigo === 96 || codigo === 99) {
    return { categoria: 'trovoada', descricao: 'Trovoada com granizo' };
  }
  return { categoria: 'nublado', descricao: 'Tempo indefinido' };
}

/**
 * Arredonda para 2 casas (cerca de 1 km): basta para o clima e não envia
 * a posição exata do computador para os serviços externos (LGPD).
 */
export function arredondarCoordenadas({ latitude, longitude }: Coordenadas): Coordenadas {
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}
