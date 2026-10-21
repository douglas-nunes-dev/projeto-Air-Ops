import { Navigate, Route, Routes } from 'react-router';
import { RotaProtegida } from '@/components/auth/RotaProtegida';
import { Entrar } from '@/pages/auth/Entrar';
import { RecuperarSenha } from '@/pages/auth/RecuperarSenha';
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha';
import { Inicio } from '@/pages/Inicio';
import { ROTA_REDEFINIR_SENHA } from '@/services/authService';

function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path={ROTA_REDEFINIR_SENHA} element={<RedefinirSenha />} />
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<Inicio />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
