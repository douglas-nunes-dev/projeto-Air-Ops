import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import type { UsuarioLogado } from '@/domain/auth/tipos';
import { podeEditarCadastros, type OrganizacaoDoUsuario } from '@/domain/organizacao/tipos';
import { ContextoOrganizacao } from '@/hooks/useOrganizacao';
import { ContextoSessao, type EstadoSessao } from '@/hooks/useSessao';

export const usuarioDeTeste: UsuarioLogado = { id: 'usuario-1', email: 'tecnico@airops.com.br' };

export const organizacaoDeTeste: OrganizacaoDoUsuario = {
  id: '11111111-1111-4111-8111-111111111111',
  nome: 'Refrigeração Teste',
  papeis: ['admin'],
};

type Opcoes = {
  /** Endereço inicial, se for diferente do caminho da tela (pode levar um estado de navegação). */
  rota?: string | { pathname: string; state: unknown };
  sessao?: Partial<EstadoSessao>;
  /** Empresa e papéis do usuário. Padrão: admin da organizacaoDeTeste. */
  organizacao?: OrganizacaoDoUsuario;
  /** Rotas extras, para conferir para onde a tela navegou. */
  outrasRotas?: Record<string, ReactNode>;
};

// Mostra o endereço atual, para os testes conferirem redirecionamentos.
function EnderecoAtual() {
  const local = useLocation();
  return <span data-testid="endereco">{local.pathname + local.search}</span>;
}

export function renderizarComRotas(tela: ReactNode, caminho: string, opcoes: Opcoes = {}) {
  const sessao: EstadoSessao = { usuario: null, carregando: false, ...opcoes.sessao };
  const organizacao = opcoes.organizacao ?? organizacaoDeTeste;
  const outrasRotas = Object.entries(opcoes.outrasRotas ?? {});
  // Cache novo a cada teste, sem repetir consultas que falham (o erro aparece na hora).
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={cache}>
      <ContextoSessao value={sessao}>
        <ContextoOrganizacao
          value={{ ...organizacao, podeEditarCadastros: podeEditarCadastros(organizacao.papeis) }}
        >
          <MemoryRouter initialEntries={[opcoes.rota ?? caminho]}>
            <Routes>
              <Route path={caminho} element={tela} />
              {outrasRotas.map(([rota, elemento]) => (
                <Route key={rota} path={rota} element={elemento} />
              ))}
            </Routes>
            <EnderecoAtual />
            <Toaster />
          </MemoryRouter>
        </ContextoOrganizacao>
      </ContextoSessao>
    </QueryClientProvider>,
  );
}
