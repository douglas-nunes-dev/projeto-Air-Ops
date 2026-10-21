import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { RotaProtegida } from '@/components/auth/RotaProtegida';
import { CarregandoLista } from '@/components/pagina/EstadosConsulta';
import { LayoutEscritorio } from '@/components/layout/LayoutEscritorio';
import { LayoutTecnico } from '@/components/layout/LayoutTecnico';
import { OrganizacaoProvider } from '@/components/layout/OrganizacaoProvider';
import { abreNoModoTecnico } from '@/domain/organizacao/tipos';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizacao } from '@/hooks/useOrganizacao';
import { ConcluirOrdem } from '@/pages/campo/ConcluirOrdem';
import { ExecucaoOrdem } from '@/pages/campo/ExecucaoOrdem';
import { Hoje } from '@/pages/campo/Hoje';
import { MinhasOrdens } from '@/pages/campo/MinhasOrdens';
import { Perfil } from '@/pages/campo/Perfil';
import { Entrar } from '@/pages/auth/Entrar';
import { RecuperarSenha } from '@/pages/auth/RecuperarSenha';
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha';
import { DetalheCliente } from '@/pages/clientes/DetalheCliente';
import { EditarCliente } from '@/pages/clientes/EditarCliente';
import { ListaClientes } from '@/pages/clientes/ListaClientes';
import { NovoCliente } from '@/pages/clientes/NovoCliente';
import { DetalheEquipamento } from '@/pages/equipamentos/DetalheEquipamento';
import { EditarEquipamento } from '@/pages/equipamentos/EditarEquipamento';
import { ListaEquipamentos } from '@/pages/equipamentos/ListaEquipamentos';
import { NovoEquipamento } from '@/pages/equipamentos/NovoEquipamento';
import { Inicio } from '@/pages/Inicio';
import { DetalheOrdem } from '@/pages/ordens/DetalheOrdem';
import { EditarOrdem } from '@/pages/ordens/EditarOrdem';
import { ListaOrdens } from '@/pages/ordens/ListaOrdens';
import { NovaOrdem } from '@/pages/ordens/NovaOrdem';
import { Preventivas } from '@/pages/preventivas/Preventivas';
import { ROTA_REDEFINIR_SENHA } from '@/services/authService';

// O calendário é pesado: só é baixado quando alguém abre a Agenda.
const Agenda = lazy(() =>
  import('@/pages/agenda/Agenda').then((modulo) => ({ default: modulo.Agenda })),
);

// Área logada: confere a sessão, carrega a empresa do usuário e mostra o menu.
function AreaLogada() {
  return (
    <OrganizacaoProvider>
      <Outlet />
    </OrganizacaoProvider>
  );
}

// Na tela inicial, o técnico vai direto para o modo técnico (antes de desenhar o escritório).
function EscritorioOuTecnico() {
  const { papeis } = useOrganizacao();
  const telaPequena = useIsMobile();
  const { pathname } = useLocation();
  if (pathname === '/' && abreNoModoTecnico(papeis, telaPequena)) {
    return <Navigate to="/campo" replace />;
  }
  return <LayoutEscritorio />;
}

function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path={ROTA_REDEFINIR_SENHA} element={<RedefinirSenha />} />
      <Route element={<RotaProtegida />}>
        <Route element={<AreaLogada />}>
          <Route path="/campo" element={<LayoutTecnico />}>
            <Route index element={<Hoje />} />
            <Route path="ordens" element={<MinhasOrdens />} />
            <Route path="ordens/:id" element={<ExecucaoOrdem />} />
            <Route path="ordens/:id/concluir" element={<ConcluirOrdem />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>
          <Route element={<EscritorioOuTecnico />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/ordens" element={<ListaOrdens />} />
            <Route path="/ordens/nova" element={<NovaOrdem />} />
            <Route path="/ordens/:id" element={<DetalheOrdem />} />
            <Route path="/ordens/:id/editar" element={<EditarOrdem />} />
            <Route
              path="/agenda"
              element={
                <Suspense fallback={<CarregandoLista linhas={8} />}>
                  <Agenda />
                </Suspense>
              }
            />
            <Route path="/clientes" element={<ListaClientes />} />
            <Route path="/clientes/novo" element={<NovoCliente />} />
            <Route path="/clientes/:id" element={<DetalheCliente />} />
            <Route path="/clientes/:id/editar" element={<EditarCliente />} />
            <Route path="/preventivas" element={<Preventivas />} />
            <Route path="/equipamentos" element={<ListaEquipamentos />} />
            <Route path="/equipamentos/novo" element={<NovoEquipamento />} />
            <Route path="/equipamentos/:id" element={<DetalheEquipamento />} />
            <Route path="/equipamentos/:id/editar" element={<EditarEquipamento />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
