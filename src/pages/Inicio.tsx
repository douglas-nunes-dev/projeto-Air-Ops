import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSessao } from '@/hooks/useSessao';
import { mensagemDeErro } from '@/lib/erros';
import { sair } from '@/services/authService';

// Página provisória: vira o Painel nas próximas etapas.
export function Inicio() {
  const { usuario } = useSessao();
  const [saindo, setSaindo] = useState(false);
  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
    } catch (erro) {
      toast.error(mensagemDeErro(erro));
      setSaindo(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">AirOps</CardTitle>
          <CardDescription>Gestão Inteligente de Manutenção</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{hoje}</p>
          <p className="text-sm">
            Conectado como <strong>{usuario?.email}</strong>
          </p>
          <Button variant="outline" onClick={aoSair} disabled={saindo}>
            <LogOut />
            {saindo ? 'Saindo…' : 'Sair'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
