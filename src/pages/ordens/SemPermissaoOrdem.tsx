import { Lock } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

type SemPermissaoOrdemProps = {
  acao: 'abrir' | 'editar';
  /** Mensagem própria (ex.: OS já encerrada). */
  motivo?: string;
  voltarPara?: string;
};

export function SemPermissaoOrdem({
  acao,
  motivo,
  voltarPara = '/ordens',
}: SemPermissaoOrdemProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <Lock className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">
        {acao === 'abrir' ? 'Você não pode abrir OS' : 'Esta OS não pode ser editada'}
      </p>
      <p className="text-sm text-muted-foreground">
        {motivo ?? 'Só administradores e gestores abrem e editam ordens de serviço.'}
      </p>
      <Button asChild variant="outline">
        <Link to={voltarPara}>Voltar</Link>
      </Button>
    </div>
  );
}
