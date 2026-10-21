import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import type { UsuarioLogado } from '@/domain/auth/tipos';
import { ContextoSessao, type EstadoSessao } from '@/hooks/useSessao';

export const usuarioDeTeste: UsuarioLogado = { id: 'usuario-1', email: 'tecnico@airops.com.br' };

type Opcoes = {
  /** Endereço inicial, se for diferente do caminho da tela (pode levar um estado de navegação). */
  rota?: string | { pathname: string; state: unknown };
  sessao?: Partial<EstadoSessao>;
  /** Rotas extras, para conferir para onde a tela navegou. */
  outrasRotas?: Record<string, ReactNode>;
};

// Mostra o endereço atual, para os testes conferirem redirecionamentos.
function EnderecoAtual() {
  return <span data-testid="endereco">{useLocation().pathname}</span>;
}

export function renderizarComRotas(tela: ReactNode, caminho: string, opcoes: Opcoes = {}) {
  const sessao: EstadoSessao = { usuario: null, carregando: false, ...opcoes.sessao };
  const outrasRotas = Object.entries(opcoes.outrasRotas ?? {});

  return render(
    <ContextoSessao value={sessao}>
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
    </ContextoSessao>,
  );
}
