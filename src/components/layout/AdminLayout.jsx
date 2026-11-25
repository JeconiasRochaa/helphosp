import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Search, Sun, WifiOff } from 'lucide-react';
import Sidebar, { useBadges } from './Sidebar';
import CommandPalette from './CommandPalette';
import UserMenu from './UserMenu';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotificationBell from '@/components/ui/NotificationBell';
import { ChamadosProvider } from '@/context/ChamadosContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { notify } from '@/lib/notify';

function Shell() {
  const [recolhido, setRecolhido] = useState(() => { try { return localStorage.getItem('hh_sb_recolhido') === '1'; } catch { return false; } });
  const [mobile, setMobile] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const { tema, alternar } = useTheme();
  const { perfil } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const badges = useBadges();

  useEffect(() => { notify.navegar = (to) => nav(to); return () => { notify.navegar = null; }; }, [nav]);
  useEffect(() => { setMobile(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { try { localStorage.setItem('hh_sb_recolhido', recolhido ? '1' : '0'); } catch { /* */ } }, [recolhido]);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaleta((p) => !p); } };
    const on = () => { setOffline(false); notify.success('Conexão restabelecida.', { chave: 'on' }); };
    const off = () => setOffline(true);
    window.addEventListener('keydown', k); window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  // pedido de permissão de push, sem travar a UI
  useEffect(() => { const t = setTimeout(() => notify.permissaoPush() === 'default' && notify.info('Ative as notificações do navegador no sino para receber alertas de chamados em segundo plano.', { titulo: 'Dica', duracao: 8000, som: false, chave: 'dica-push' }), 6000); return () => clearTimeout(t); }, []);

  return (
    <div className={'app-shell' + (recolhido ? ' recolhido' : '') + (mobile ? ' mobile-aberto' : '')}>
      <Sidebar recolhido={recolhido} onToggle={() => setRecolhido((r) => !r)} onNavigate={() => setMobile(false)} badges={badges} />
      <div className="sb-overlay" onClick={() => setMobile(false)} />
      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn menu-mobile" aria-label="Abrir menu" onClick={() => setMobile(true)}><Menu size={18} /></button>
          <button className="busca-rapida" onClick={() => setPaleta(true)}><Search size={16} /><span style={{ flex: 1, textAlign: 'left' }}>Buscar páginas e chamados…</span><kbd className="kbd">Ctrl K</kbd></button>
          <span className="spacer" />
          {offline && <span className="badge badge-red"><WifiOff size={12} />Sem conexão</span>}
          <button className="icon-btn" onClick={alternar} aria-label="Alternar tema">{tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <NotificationBell />
          <span className="topbar-sep" />
          <UserMenu />
        </header>
        <main className="content" id="conteudo"><ErrorBoundary key={loc.pathname}><Outlet /></ErrorBoundary></main>
      </div>
      <CommandPalette aberto={paleta} onClose={() => setPaleta(false)} />
      {perfil?.primeiro_acesso && null}
    </div>
  );
}
export default function AdminLayout() { return <ChamadosProvider><Shell /></ChamadosProvider>; }
export { useCallback };
