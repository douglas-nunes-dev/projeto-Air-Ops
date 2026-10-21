import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type CampoBuscaProps = {
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder: string;
};

export function CampoBusca({ valor, aoMudar, placeholder }: CampoBuscaProps) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-background pl-8"
      />
    </div>
  );
}
