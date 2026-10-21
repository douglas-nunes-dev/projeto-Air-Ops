import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroDados } from '@/domain/erros';
import { OpenMeteoClimaProvider } from './OpenMeteoClimaProvider';

const RESPOSTA_CLIMA = { current: { temperature_2m: 24.6, weather_code: 2, is_day: 1 } };
const RESPOSTA_CIDADE = { city: 'Passos', locality: 'Passos', principalSubdivisionCode: 'BR-MG' };

function responder(clima: unknown, cidade: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const corpo = url.includes('open-meteo') ? clima : cidade;
      if (corpo instanceof Error) throw corpo;
      return new Response(JSON.stringify(corpo), { status: 200 });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenMeteoClimaProvider', () => {
  const coordenadas = { latitude: -20.72, longitude: -46.61 };

  it('junta clima e cidade, com temperatura arredondada', async () => {
    responder(RESPOSTA_CLIMA, RESPOSTA_CIDADE);
    const clima = await new OpenMeteoClimaProvider().buscar(coordenadas);
    expect(clima).toEqual({ temperatura: 25, codigo: 2, ehDia: true, cidade: 'Passos/MG' });
  });

  it('sem o nome da cidade, o clima ainda vem', async () => {
    responder(RESPOSTA_CLIMA, new TypeError('Failed to fetch'));
    const clima = await new OpenMeteoClimaProvider().buscar(coordenadas);
    expect(clima.cidade).toBeNull();
  });

  it('sem internet, lança ErroDados de conexão', async () => {
    responder(new TypeError('Failed to fetch'), RESPOSTA_CIDADE);
    await expect(new OpenMeteoClimaProvider().buscar(coordenadas)).rejects.toMatchObject({
      motivo: 'sem_conexao',
    });
  });

  it('resposta em formato inesperado vira ErroDados', async () => {
    responder({ outra: 'coisa' }, RESPOSTA_CIDADE);
    await expect(new OpenMeteoClimaProvider().buscar(coordenadas)).rejects.toBeInstanceOf(
      ErroDados,
    );
  });
});
