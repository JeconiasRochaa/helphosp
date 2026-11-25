import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Spinner, EmptyState, Button } from '@/components/ui';

/** Exige equipe autenticada (perfil ativo). Força troca de senha no primeiro acesso. */
export function RequireStaff() {
  const { carregando, isStaff, contaSemPerfil, perfil, logout, user } = useAuth();
  const loc = useLocation();
  if (carregando) return <Spinner label="Verificando acesso..." />;
  if (contaSemPerfil) return (
    <div style={{ padding: 40, maxWidth: 520, margin: '10vh auto' }}>
      <EmptyState icon={ShieldOff} title="Conta sem permissão">Sua conta existe, mas não tem perfil ativo no sistema. Fale com um administrador.<div style={{ marginTop: 14 }}><Button variant="outline" onClick={() => logout()}>Sair</Button></div></EmptyState>
    </div>
  );
  if (!isStaff || !user || user.isAnonymous) return <Navigate to="/login" replace state={{ de: loc.pathname + loc.search }} />;
  if (perfil.primeiro_acesso && loc.pathname !== '/trocar-senha') return <Navigate to="/trocar-senha" replace />;
  return <Outlet />;
}

/** Restringe uma rota por permissão: <RequirePerm check={(p)=>p.podeEquipe}> */
export function RequirePerm({ check, children }) {
  const { perms } = useAuth();
  if (!check(perms)) return <div style={{ padding: 40 }}><EmptyState icon={ShieldOff} title="Acesso restrito">Você não tem permissão para acessar esta área.</EmptyState></div>;
  return children;
}
