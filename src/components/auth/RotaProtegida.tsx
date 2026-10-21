import { Navigate, Outlet, useLocation } from 'react-router';
import { useSessao } from '@/hooks/useSessao';
import { TelaCarregando } from '@/components/TelaCarregando';

// Só esconde as telas de quem não está logado. A proteção dos dados é feita pelo RLS no banco.
export function RotaProtegida() {
  const { usuario, carregando } = useSessao();
  const local = useLocation();

  if (carregando) return <TelaCarregando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ voltarPara: local.pathname }} />;

  return <Outlet />;
}
