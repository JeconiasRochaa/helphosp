import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ConfigProvider } from '@/context/ConfigContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotifyHost, Spinner } from '@/components/ui';
import { RequireStaff, RequirePerm } from '@/components/RouteGuards';
import AdminLayout from '@/components/layout/AdminLayout';
import PortalShell from '@/components/PortalShell';
import ErrorBoundary from '@/components/ErrorBoundary';

const L = (f) => lazy(f);
// portal (público)
const Home = L(() => import('@/pages/portal/Home'));
const AbrirChamado = L(() => import('@/pages/portal/AbrirChamado'));
const GestHospForm = L(() => import('@/pages/portal/GestHospForm'));
const MeusChamados = L(() => import('@/pages/portal/MeusChamados'));
const ChamadoPortal = L(() => import('@/pages/portal/ChamadoPortal'));
// auth
const Login = L(() => import('@/pages/auth/Login'));
const TrocarSenha = L(() => import('@/pages/auth/TrocarSenha'));
const Setup = L(() => import('@/pages/auth/Setup'));
// painel
const Dashboard = L(() => import('@/pages/admin/Dashboard'));
const Chamados = L(() => import('@/pages/admin/Chamados'));
const ChamadoDetalhe = L(() => import('@/pages/admin/ChamadoDetalhe'));
const Sla = L(() => import('@/pages/admin/Sla'));
const Servicos = L(() => import('@/pages/admin/Servicos'));
const Indicadores = L(() => import('@/pages/admin/Indicadores'));
const GestHosp = L(() => import('@/pages/admin/GestHosp'));
const Toners = L(() => import('@/pages/admin/Toners'));
const Estoque = L(() => import('@/pages/admin/Estoque'));
const Inventario = L(() => import('@/pages/admin/Inventario'));
const IpsDispositivos = L(() => import('@/pages/admin/ips/Dispositivos'));
const IpsRedes = L(() => import('@/pages/admin/ips/Redes'));
const IpsHistorico = L(() => import('@/pages/admin/ips/Historico'));
const Equipe = L(() => import('@/pages/admin/Equipe'));
const Auditoria = L(() => import('@/pages/admin/Auditoria'));
const Arquivos = L(() => import('@/pages/admin/Arquivos'));
const Agenda = L(() => import('@/pages/admin/Agenda'));
const Configuracoes = L(() => import('@/pages/admin/Configuracoes'));
const Escala = L(() => import('@/pages/admin/Escala'));
const Profissionais = L(() => import('@/pages/admin/Profissionais'));
const PainelTV = L(() => import('@/pages/admin/PainelTV'));

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <ConfigProvider>
          <BrowserRouter>
            <Suspense fallback={<Spinner label="Carregando..." />}>
              <Routes>
                {/* portal público — identificado por aparelho (Auth anônimo) */}
                <Route element={<PortalShell />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/abrir/:dep" element={<AbrirChamado />} />
                  <Route path="/gesthosp" element={<GestHospForm />} />
                  <Route path="/meus-chamados" element={<MeusChamados />} />
                  <Route path="/meus-chamados/:id" element={<ChamadoPortal />} />
                </Route>
                <Route path="/login" element={<Login />} />
                <Route path="/setup" element={<Setup />} />
                {/* Painel TV: livre (sem login) — lê só o espelho público e anônimo `tv_chamados` */}
                <Route path="/tv" element={<PainelTV />} />

                {/* equipe */}
                <Route element={<RequireStaff />}>
                  <Route path="/trocar-senha" element={<TrocarSenha />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="chamados" element={<Chamados />} />
                    <Route path="chamados/:id" element={<ChamadoDetalhe />} />
                    <Route path="servicos" element={<Servicos />} />
                    <Route path="escala" element={<RequirePerm check={(p) => p.isManut}><Escala /></RequirePerm>} />
                    <Route path="profissionais" element={<RequirePerm check={(p) => p.isManut}><Profissionais /></RequirePerm>} />
                    <Route path="sla" element={<Sla />} />
                    <Route path="indicadores" element={<Indicadores />} />
                    <Route path="gesthosp" element={<RequirePerm check={(p) => p.podeFerramentasTI}><GestHosp /></RequirePerm>} />
                    <Route path="toners" element={<RequirePerm check={(p) => p.podeFerramentasTI}><Toners /></RequirePerm>} />
                    <Route path="estoque" element={<RequirePerm check={(p) => p.podeFerramentasTI}><Estoque /></RequirePerm>} />
                    <Route path="inventario" element={<RequirePerm check={(p) => p.podeFerramentasTI}><Inventario /></RequirePerm>} />
                    <Route path="ips" element={<RequirePerm check={(p) => p.podeFerramentasTI}><IpsDispositivos /></RequirePerm>} />
                    <Route path="ips/redes" element={<RequirePerm check={(p) => p.podeFerramentasTI}><IpsRedes /></RequirePerm>} />
                    <Route path="ips/historico" element={<RequirePerm check={(p) => p.podeFerramentasTI}><IpsHistorico /></RequirePerm>} />
                    <Route path="equipe" element={<RequirePerm check={(p) => p.podeEquipe}><Equipe /></RequirePerm>} />
                    <Route path="auditoria" element={<RequirePerm check={(p) => p.podeAuditoria}><Auditoria /></RequirePerm>} />
                    <Route path="arquivos" element={<Arquivos />} />
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="config" element={<Configuracoes />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <NotifyHost />
          </BrowserRouter>
        </ConfigProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
