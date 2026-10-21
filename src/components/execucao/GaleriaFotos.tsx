import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CloudOff, ImagePlus, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { FotoDaOrdem, FotoPendente } from '@/domain/ordem/execucao';
import type { Ordem } from '@/domain/ordem/tipos';
import { useFotosPendentes } from '@/hooks/useFotosPendentes';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { formatarDataHora } from '@/lib/texto';
import {
  adicionarFoto,
  descartarFotoPendente,
  enderecosDasFotos,
  removerFoto,
} from '@/services/storageService';

type Props = {
  ordem: Pick<Ordem, 'id' | 'organizacaoId'>;
  fotos: FotoDaOrdem[];
  /** Só o técnico da OS, com ela em execução ou pausada. */
  podeEnviar: boolean;
};

export function GaleriaFotos({ ordem, fotos, podeEnviar }: Props) {
  const cache = useQueryClient();
  const pendentes = useFotosPendentes(ordem.id);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [guardando, setGuardando] = useState(false);

  const caminhos = fotos.map((foto) => foto.caminho);
  const enderecos = useQuery({
    queryKey: chaves.enderecosFotos(ordem.id, caminhos),
    queryFn: () => enderecosDasFotos(fotos),
    enabled: fotos.length > 0,
    // Os endereços valem 1 hora; renova antes de vencer.
    staleTime: 50 * 60_000,
  });

  // Quando uma foto sai da fila (foi enviada), busca a lista de novo para ela aparecer.
  const quantasPendentes = pendentes.length;
  const anterior = useRef(quantasPendentes);
  useEffect(() => {
    if (quantasPendentes < anterior.current) {
      void cache.invalidateQueries({ queryKey: chaves.execucao(ordem.id) });
    }
    anterior.current = quantasPendentes;
  }, [quantasPendentes, cache, ordem.id]);

  const remover = useMutation({
    mutationFn: removerFoto,
    onSuccess: () => cache.invalidateQueries({ queryKey: chaves.execucao(ordem.id) }),
    onError: (erro) => toast.error(mensagemDeErro(erro)),
  });

  async function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(evento.target.files ?? [])];
    evento.target.value = '';
    if (arquivos.length === 0) return;
    setGuardando(true);
    try {
      for (const arquivo of arquivos) await adicionarFoto(ordem, arquivo);
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
    } finally {
      setGuardando(false);
    }
  }

  const vazia = fotos.length === 0 && pendentes.length === 0;

  return (
    <div className="space-y-4">
      {podeEnviar && (
        <>
          <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Fotografe só equipamentos e instalações. Nunca pacientes, prontuários, telas ou
            documentos.
          </p>
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1"
              disabled={guardando}
              onClick={() => camera.current?.click()}
            >
              <Camera />
              {guardando ? 'Guardando…' : 'Tirar foto'}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={guardando}
              onClick={() => galeria.current?.click()}
              aria-label="Escolher da galeria"
            >
              <ImagePlus />
            </Button>
          </div>
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            data-testid="entrada-camera"
            onChange={aoEscolher}
          />
          <input
            ref={galeria}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={aoEscolher}
          />
        </>
      )}

      {vazia ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((foto, indice) => (
            <li key={foto.id} className="relative">
              <a
                href={enderecos.data?.[indice] || undefined}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-md bg-muted"
              >
                {enderecos.data?.[indice] && (
                  <img
                    src={enderecos.data[indice]}
                    alt={foto.legenda ?? `Foto de ${formatarDataHora(foto.tiradaEm)}`}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                )}
              </a>
              {podeEnviar && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 right-1 size-7"
                  aria-label={`Apagar foto de ${formatarDataHora(foto.tiradaEm)}`}
                  disabled={remover.isPending}
                  onClick={() => remover.mutate(foto)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
          {pendentes.map((foto) => (
            <MiniaturaPendente key={foto.id} foto={foto} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniaturaPendente({ foto }: { foto: FotoPendente }) {
  const endereco = useMemo(() => URL.createObjectURL(foto.arquivo), [foto.arquivo]);
  useEffect(() => () => URL.revokeObjectURL(endereco), [endereco]);

  return (
    <li className="relative">
      <div className="aspect-square overflow-hidden rounded-md bg-muted">
        <img
          src={endereco}
          alt="Foto aguardando envio"
          className="size-full object-cover opacity-60"
        />
      </div>
      <div className="absolute inset-x-1 bottom-1 rounded bg-background/90 px-1 py-0.5 text-[10px] leading-tight">
        {foto.erro ? (
          <span className="flex items-center justify-between gap-1 text-destructive">
            <span className="truncate" title={foto.erro}>
              Não enviada
            </span>
            <button
              type="button"
              className="underline"
              onClick={() => void descartarFotoPendente(foto.id)}
            >
              Descartar
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <CloudOff className="size-3" aria-hidden />
            Aguardando envio
          </span>
        )}
      </div>
    </li>
  );
}
