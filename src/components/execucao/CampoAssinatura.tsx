import { Eraser } from 'lucide-react';
import { useImperativeHandle, useRef, type Ref } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

export type ControleAssinatura = {
  /** Assinatura em JPEG (fundo branco), ou null se nada foi desenhado. */
  obterImagem: () => Promise<Blob | null>;
};

type Props = {
  ref?: Ref<ControleAssinatura>;
  /** Avisa quando passa a ter (ou deixa de ter) algo desenhado. */
  aoMudar: (assinou: boolean) => void;
  invalido?: boolean;
};

// Quadro para o cliente assinar com o dedo.
export function CampoAssinatura({ ref, aoMudar, invalido = false }: Props) {
  const quadro = useRef<SignatureCanvas>(null);

  useImperativeHandle(ref, () => ({
    obterImagem: () => {
      const assinatura = quadro.current;
      if (!assinatura || assinatura.isEmpty()) return Promise.resolve(null);
      return new Promise((resolver) =>
        assinatura.getCanvas().toBlob((imagem) => resolver(imagem), 'image/jpeg', 0.9),
      );
    },
  }));

  function limpar() {
    quadro.current?.clear();
    aoMudar(false);
  }

  return (
    <div className="space-y-2">
      <div
        className={`overflow-hidden rounded-lg border-2 border-dashed bg-white ${
          invalido ? 'border-destructive' : 'border-input'
        }`}
      >
        <SignatureCanvas
          ref={quadro}
          penColor="#111827"
          // Fundo branco: a imagem é salva em JPEG, que não tem transparência.
          backgroundColor="rgb(255,255,255)"
          // No celular, abrir o teclado muda o tamanho da tela; sem isto, a assinatura sumiria.
          clearOnResize={false}
          onEnd={() => aoMudar(true)}
          canvasProps={{
            className: 'block h-44 w-full touch-none',
            'aria-label': 'Quadro de assinatura',
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Assine com o dedo dentro do quadro.</p>
        <Button type="button" variant="ghost" size="sm" onClick={limpar}>
          <Eraser />
          Limpar
        </Button>
      </div>
    </div>
  );
}
