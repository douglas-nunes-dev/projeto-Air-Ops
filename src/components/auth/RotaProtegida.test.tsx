import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ContextoSessao, type EstadoSessao } from '@/hooks/useSessao';
import { usuarioDeTeste } from '@/test/renderizar';
import { RotaProtegida } from './RotaProtegida';

function renderizar(sessao: EstadoSessao) {
  return render(
    <ContextoSessao value={sessao}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/entrar" element={<p>Tela de login</p>} />
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<p>Painel</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ContextoSessao>,
  );
}

describe('RotaProtegida', () => {
  it('manda para o login quem não está logado', () => {
    renderizar({ usuario: null, carregando: false });
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('mostra a tela para quem está logado', () => {
    renderizar({ usuario: usuarioDeTeste, carregando: false });
    expect(screen.getByText('Painel')).toBeInTheDocument();
  });

  it('enquanto confere a sessão, mostra o carregando', () => {
    renderizar({ usuario: null, carregando: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
