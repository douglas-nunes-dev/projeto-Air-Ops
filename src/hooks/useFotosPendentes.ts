import { useEffect, useState } from 'react';
import type { FotoPendente } from '@/domain/ordem/execucao';
import { listarFotosPendentes, observarFilaDeFotos } from '@/services/storageService';

/** Fotos guardadas no aparelho esperando envio (de uma OS, ou de todas). */
export function useFotosPendentes(ordemId?: string): FotoPendente[] {
  const [fotos, setFotos] = useState<FotoPendente[]>([]);

  useEffect(() => {
    let ativo = true;
    const recarregar = () => {
      listarFotosPendentes(ordemId)
        .then((lista) => {
          if (ativo) setFotos(lista);
        })
        // Sem IndexedDB (ex.: janela anônima de alguns navegadores): simplesmente não há fila.
        .catch(() => undefined);
    };
    recarregar();
    const pararDeObservar = observarFilaDeFotos(recarregar);
    return () => {
      ativo = false;
      pararDeObservar();
    };
  }, [ordemId]);

  return fotos;
}
