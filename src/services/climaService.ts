import { climaProvider } from '@/data';
import { arredondarCoordenadas, type Clima, type Coordenadas } from '@/domain/clima/tipos';

export async function buscarClima(coordenadas: Coordenadas): Promise<Clima> {
  return climaProvider.buscar(arredondarCoordenadas(coordenadas));
}
