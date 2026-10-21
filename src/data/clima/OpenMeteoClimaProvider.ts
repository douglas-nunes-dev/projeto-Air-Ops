import { z } from 'zod';
import type { ClimaProvider } from '../repositories/ClimaProvider';
import type { Clima, Coordenadas } from '@/domain/clima/tipos';
import { ErroDados } from '@/domain/erros';

// Dois serviços gratuitos, sem chave de acesso e liberados para uso direto do navegador:
// Open-Meteo (clima atual) e BigDataCloud (nome da cidade a partir das coordenadas).
const URL_CLIMA = 'https://api.open-meteo.com/v1/forecast';
const URL_CIDADE = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

const RespostaClimaSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number(),
    is_day: z.number(),
  }),
});

const RespostaCidadeSchema = z.object({
  city: z.string().optional(),
  locality: z.string().optional(),
  /** Ex.: "BR-MG". */
  principalSubdivisionCode: z.string().optional(),
});

async function buscarJson(url: string): Promise<unknown> {
  let resposta: Response;
  try {
    resposta = await fetch(url);
  } catch (erro) {
    throw new ErroDados('sem_conexao', { cause: erro });
  }
  if (!resposta.ok) throw new ErroDados('desconhecido', { mensagem: 'Clima indisponível.' });
  return resposta.json();
}

export class OpenMeteoClimaProvider implements ClimaProvider {
  async buscar({ latitude, longitude }: Coordenadas): Promise<Clima> {
    const [clima, cidade] = await Promise.all([
      this.buscarClima(latitude, longitude),
      // Sem o nome da cidade, o clima ainda aparece.
      this.buscarCidade(latitude, longitude).catch(() => null),
    ]);
    return { ...clima, cidade };
  }

  private async buscarClima(latitude: number, longitude: number) {
    const parametros = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,weather_code,is_day',
      timezone: 'auto',
    });
    const dados = RespostaClimaSchema.safeParse(await buscarJson(`${URL_CLIMA}?${parametros}`));
    if (!dados.success) {
      throw new ErroDados('desconhecido', { mensagem: 'Clima indisponível.', cause: dados.error });
    }
    return {
      temperatura: Math.round(dados.data.current.temperature_2m),
      codigo: dados.data.current.weather_code,
      ehDia: dados.data.current.is_day === 1,
    };
  }

  private async buscarCidade(latitude: number, longitude: number): Promise<string | null> {
    const parametros = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'pt',
    });
    const dados = RespostaCidadeSchema.parse(await buscarJson(`${URL_CIDADE}?${parametros}`));
    const cidade = dados.city || dados.locality;
    if (!cidade) return null;
    const uf = dados.principalSubdivisionCode?.match(/^BR-([A-Z]{2})$/)?.[1];
    return uf ? `${cidade}/${uf}` : cidade;
  }
}
