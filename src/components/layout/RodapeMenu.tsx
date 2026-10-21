import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from 'lucide-react';
import { SidebarFooter } from '@/components/ui/sidebar';
import { descreverTempo, LOCAL_PADRAO, type CategoriaTempo } from '@/domain/clima/tipos';
import { saudacao } from '@/domain/comum/saudacao';
import { useAgora } from '@/hooks/useAgora';
import { useLocalizacao } from '@/hooks/useLocalizacao';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { buscarClima } from '@/services/climaService';

const TRINTA_MINUTOS = 30 * 60_000;

function IconeTempo({ categoria, ehDia }: { categoria: CategoriaTempo; ehDia: boolean }) {
  const classe = 'size-5 shrink-0 text-amber-300';
  switch (categoria) {
    case 'limpo':
      return ehDia ? (
        <Sun className={classe} aria-hidden />
      ) : (
        <Moon className={classe} aria-hidden />
      );
    case 'poucas_nuvens':
      return ehDia ? (
        <CloudSun className={classe} aria-hidden />
      ) : (
        <CloudMoon className={classe} aria-hidden />
      );
    case 'nublado':
      return <Cloud className={classe} aria-hidden />;
    case 'neblina':
      return <CloudFog className={classe} aria-hidden />;
    case 'garoa':
      return <CloudDrizzle className={classe} aria-hidden />;
    case 'chuva':
      return <CloudRain className={classe} aria-hidden />;
    case 'neve':
      return <CloudSnow className={classe} aria-hidden />;
    case 'trovoada':
      return <CloudLightning className={classe} aria-hidden />;
  }
}

function ClimaAtual() {
  const localizacao = useLocalizacao();
  const consulta = useQuery({
    queryKey: ['clima', localizacao?.coordenadas],
    queryFn: () => buscarClima(localizacao!.coordenadas),
    enabled: localizacao !== null,
    staleTime: TRINTA_MINUTOS,
    refetchInterval: TRINTA_MINUTOS,
    retry: 1,
  });

  // Clima é um extra: se o serviço falhar, a linha simplesmente não aparece.
  if (consulta.isError) return null;
  if (!consulta.data) {
    return <p className="text-xs text-sidebar-foreground/50">Carregando o clima…</p>;
  }

  const { temperatura, codigo, ehDia, cidade } = consulta.data;
  const tempo = descreverTempo(codigo);
  const nomeCidade = cidade ?? (localizacao?.doAparelho ? null : LOCAL_PADRAO.cidade);

  return (
    <div className="flex items-center gap-2" title={tempo.descricao}>
      <IconeTempo categoria={tempo.categoria} ehDia={ehDia} />
      <p className="min-w-0 text-xs leading-tight">
        <span className="font-medium text-white">{temperatura} °C</span>{' '}
        <span className="text-sidebar-foreground/70">· {tempo.descricao}</span>
        {nomeCidade && (
          <span className="block truncate text-sidebar-foreground/60">{nomeCidade}</span>
        )}
      </p>
    </div>
  );
}

// Saudação conforme a hora, nome de quem entrou, relógio e clima do lugar onde o computador está.
export function RodapeMenu() {
  const organizacao = useOrganizacao();
  const agora = useAgora();
  const primeiroNome = organizacao.nomeUsuario.split(/[\s@]/)[0];

  return (
    <SidebarFooter>
      <div className="space-y-3 rounded-lg bg-white/5 p-3">
        <div>
          <p className="truncate text-sm font-medium text-white">
            {saudacao(agora)}, {primeiroNome}!
          </p>
          <p className="text-xs text-sidebar-foreground/70">
            <time dateTime={agora.toISOString()}>
              <span className="text-base font-semibold text-white tabular-nums">
                {format(agora, 'HH:mm')}
              </span>{' '}
              · <span className="capitalize">{format(agora, 'EEE, d MMM', { locale: ptBR })}</span>
            </time>
          </p>
        </div>
        <ClimaAtual />
      </div>
    </SidebarFooter>
  );
}
