import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Página provisória: substituída pelo login na etapa 0.
export function Inicio() {
  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">AirOps</CardTitle>
          <CardDescription>Gestão Inteligente de Manutenção</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{hoje}</p>
          <Button onClick={() => toast.success('Ambiente configurado')}>
            <Wrench />
            Testar
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
