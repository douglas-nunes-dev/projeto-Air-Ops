import { SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

type NaoEncontradoProps = {
  /** O que não foi encontrado, para a mensagem (ex.: "Cliente"). */
  oQue: string;
  voltarPara: string;
  /** Para concordar com palavras femininas (ex.: "Ordem de serviço não encontrada"). */
  feminino?: boolean;
};

export function NaoEncontrado({ oQue, voltarPara, feminino = false }: NaoEncontradoProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">
        {oQue} não {feminino ? 'encontrada' : 'encontrado'}
      </p>
      <p className="text-sm text-muted-foreground">
        {feminino
          ? 'Ela pode não estar disponível para você, ou o endereço está incorreto.'
          : 'Ele pode ter sido removido, ou o endereço está incorreto.'}
      </p>
      <Button asChild variant="outline">
        <Link to={voltarPara}>Voltar para a lista</Link>
      </Button>
    </div>
  );
}
