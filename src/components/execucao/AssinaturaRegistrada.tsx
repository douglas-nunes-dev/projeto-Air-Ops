import { useQuery } from '@tanstack/react-query';
import type { AssinaturaDaOrdem } from '@/domain/ordem/execucao';
import { chaves } from '@/lib/chavesConsulta';
import { formatarDataHora } from '@/lib/texto';
import { enderecosDasFotos } from '@/services/storageService';

/** Assinatura gravada na conclusão: imagem + nome, ou o motivo de não haver. */
export function AssinaturaRegistrada({
  ordemId,
  assinatura,
}: {
  ordemId: string;
  assinatura: AssinaturaDaOrdem;
}) {
  const caminho = assinatura.caminho;
  const endereco = useQuery({
    queryKey: chaves.enderecosFotos(ordemId, caminho ? [caminho] : []),
    queryFn: async () => (await enderecosDasFotos([{ caminho: caminho ?? '' }]))[0],
    enabled: Boolean(caminho),
    staleTime: 50 * 60_000,
  });

  if (!caminho) {
    return (
      <p className="text-sm">
        Sem assinatura do cliente. Motivo: {assinatura.motivoSemAssinatura}
        <span className="block text-xs text-muted-foreground">
          {formatarDataHora(assinatura.criadoEm)}
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex h-24 w-56 items-center justify-center rounded-md border bg-white">
        {endereco.data && (
          <img
            src={endereco.data}
            alt={`Assinatura de ${assinatura.nomeAssinante}`}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>
      <p className="text-sm font-medium">{assinatura.nomeAssinante}</p>
      <p className="text-xs text-muted-foreground">
        Assinado em {formatarDataHora(assinatura.criadoEm)}
      </p>
    </div>
  );
}
