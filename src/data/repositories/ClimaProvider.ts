import type { Clima, Coordenadas } from '@/domain/clima/tipos';

// Toda falha deve ser lançada como ErroDados.
export interface ClimaProvider {
  buscar(coordenadas: Coordenadas): Promise<Clima>;
}
