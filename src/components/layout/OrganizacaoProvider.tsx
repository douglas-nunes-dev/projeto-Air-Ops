import { useQuery } from '@tanstack/react-query';
import { Building2, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { TelaCarregando } from '@/components/TelaCarregando';
import { Button } from '@/components/ui/button';
import { podeAbrirOrdens, podeEditarCadastros } from '@/domain/organizacao/tipos';
import { ContextoOrganizacao } from '@/hooks/useOrganizacao';
import { useSessao } from '@/hooks/useSessao';
import { chaves } from '@/lib/chavesConsulta';
import { mensagemDeErro } from '@/lib/erros';
import { sair } from '@/services/authService';
import { listarMinhasOrganizacoes } from '@/services/organizacaoService';

function AvisoCentral({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <Building2 className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{texto}</p>
        {children}
      </div>
    </main>
  );
}

// No MVP, a pessoa trabalha numa empresa só: usa a primeira em que tem vínculo ativo.
// A escolha entre várias empresas fica para a fase SaaS (seção 3).
export function OrganizacaoProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSessao();
  const consulta = useQuery({
    queryKey: chaves.minhasOrganizacoes(usuario?.id ?? ''),
    queryFn: listarMinhasOrganizacoes,
    enabled: Boolean(usuario),
  });

  if (consulta.isPending) return <TelaCarregando />;

  if (consulta.isError) {
    return (
      <AvisoCentral
        titulo="Não foi possível carregar sua empresa"
        texto={mensagemDeErro(consulta.error)}
      >
        <Button variant="outline" onClick={() => consulta.refetch()}>
          <RotateCw />
          Tentar de novo
        </Button>
      </AvisoCentral>
    );
  }

  const [organizacao] = consulta.data;
  if (!organizacao) {
    return (
      <AvisoCentral
        titulo="Sua conta ainda não está ligada a uma empresa"
        texto="Peça ao administrador da sua empresa para adicionar o seu e-mail."
      >
        <Button variant="outline" onClick={() => sair()}>
          Sair
        </Button>
      </AvisoCentral>
    );
  }

  return (
    <ContextoOrganizacao
      value={{
        ...organizacao,
        podeEditarCadastros: podeEditarCadastros(organizacao.papeis),
        podeAbrirOrdens: podeAbrirOrdens(organizacao.papeis),
      }}
    >
      {children}
    </ContextoOrganizacao>
  );
}
