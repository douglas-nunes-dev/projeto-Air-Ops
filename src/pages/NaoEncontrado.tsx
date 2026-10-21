import { SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

type NaoEncontradoProps = {
  /** O que não foi encontrado, para a mensagem (ex.: "Cliente"). */
  oQue: string;
  voltarPara: string;
};

export function NaoEncontrado({ oQue, voltarPara }: NaoEncontradoProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{oQue} não encontrado</p>
      <p className="text-sm text-muted-foreground">
        Ele pode ter sido removido, ou o endereço está incorreto.
      </p>
      <Button asChild variant="outline">
        <Link to={voltarPara}>Voltar para a lista</Link>
      </Button>
    </div>
  );
}
