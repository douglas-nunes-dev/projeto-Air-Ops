import { useEffect, useState, type ReactNode } from 'react';
import { ContextoSessao, type EstadoSessao } from '@/hooks/useSessao';
import { observarSessao, usuarioAtual } from '@/services/authService';

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSessao>({ usuario: null, carregando: true });

  useEffect(() => {
    let ativo = true;

    usuarioAtual()
      .then((usuario) => {
        if (ativo) setEstado({ usuario, carregando: false });
      })
      .catch(() => {
        // Sem configuração ou sem rede: trata como deslogado; a tela de login mostra o erro ao tentar entrar.
        if (ativo) setEstado({ usuario: null, carregando: false });
      });

    let pararDeObservar = () => {};
    try {
      pararDeObservar = observarSessao((_evento, usuario) => {
        if (ativo) setEstado({ usuario, carregando: false });
      });
    } catch {
      // Mesmo caso acima: sem configuração não há sessão para observar.
    }

    return () => {
      ativo = false;
      pararDeObservar();
    };
  }, []);

  return <ContextoSessao value={estado}>{children}</ContextoSessao>;
}
