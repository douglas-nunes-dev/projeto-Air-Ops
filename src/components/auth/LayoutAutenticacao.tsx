import type { ReactNode } from 'react';
import logo from '@/assets/logo-airops.png';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LayoutAutenticacaoProps = {
  titulo: string;
  descricao: string;
  children: ReactNode;
};

export function LayoutAutenticacao({ titulo, descricao, children }: LayoutAutenticacaoProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-4">
      <img
        src={logo}
        alt="AirOps — Gestão inteligente para empresas de climatização"
        className="w-64"
      />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{titulo}</CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
