import { Navigate, Outlet, Route, Routes } from 'react-router';
import { RotaProtegida } from '@/components/auth/RotaProtegida';
import { LayoutEscritorio } from '@/components/layout/LayoutEscritorio';
import { OrganizacaoProvider } from '@/components/layout/OrganizacaoProvider';
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
import { ROTA_REDEFINIR_SENHA } from '@/services/authService';

// Área logada: confere a sessão, carrega a empresa do usuário e mostra o menu.
function AreaLogada() {
  return (
    <OrganizacaoProvider>
      <Outlet />
    </OrganizacaoProvider>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path={ROTA_REDEFINIR_SENHA} element={<RedefinirSenha />} />
      <Route element={<RotaProtegida />}>
        <Route element={<AreaLogada />}>
          <Route element={<LayoutEscritorio />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/ordens" element={<ListaOrdens />} />
            <Route path="/ordens/nova" element={<NovaOrdem />} />
            <Route path="/ordens/:id" element={<DetalheOrdem />} />
            <Route path="/ordens/:id/editar" element={<EditarOrdem />} />
            <Route path="/clientes" element={<ListaClientes />} />
            <Route path="/clientes/novo" element={<NovoCliente />} />
            <Route path="/clientes/:id" element={<DetalheCliente />} />
            <Route path="/clientes/:id/editar" element={<EditarCliente />} />
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
