import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Moon, Settings, Sun, Wrench, Monitor } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar } from '@/components/ui';
import InstallButton from '@/components/InstallButton';

const ROTULO = { admin: 'Administrador', supervisor: 'Supervisor', tecnico: 'Técnico' };

/** Quem está logado — canto superior direito. */
export default function UserMenu() {
  const { perfil, perms, logout, setPainel } = useAuth();
  const { tema, alternar } = useTheme();
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!ref.current?.contains(e.target)) setAberto(false); };
    const esc = (e) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);
  if (!perfil) return null;
  const Icone = perms.isManut ? Wrench : Monitor;
  return (
    <div className="user-menu" ref={ref}>
      <button className="user-chip" onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto}>
        <Avatar nome={perfil.nome} />
        <span className="uc-info"><strong>{perfil.nome}</strong><small>{ROTULO[perfil.tipo] || perfil.cargo} · <span className={`uc-painel ${perms.isManut ? 'manut' : 'ti'}`}>{perms.isManut ? 'Manutenção' : 'TI'}</span></small></span>
        <ChevronDown size={15} className="uc-seta" />
      </button>
      {aberto && (
        <div className="um-pop" role="menu">
          <div className="um-head"><Avatar nome={perfil.nome} size="lg" /><div><strong>{perfil.nome}</strong><small>@{perfil.usuario}</small><small><Icone size={11} /> {perms.isManut ? 'Manutenção' : 'Tecnologia da Informação'}</small></div></div>
          {perms.isAdmin && (
            <div className="um-sec"><span>Painel ativo</span>
              <div className="um-seg">
                <button className={perms.dep === 'TI' ? 'on' : ''} onClick={() => { setPainel('TI'); setAberto(false); }}><Monitor size={13} /> TI</button>
                <button className={perms.dep === 'MANUTENCAO' ? 'on manut' : ''} onClick={() => { setPainel('MANUTENCAO'); setAberto(false); }}><Wrench size={13} /> Manutenção</button>
              </div></div>)}
          <button className="um-item" onClick={() => { setAberto(false); nav('/admin/config'); }}><Settings size={16} /> Minha conta</button>
          <button className="um-item" onClick={alternar}>{tema === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Tema {tema === 'dark' ? 'claro' : 'escuro'}</button>
          <InstallButton variante="menu" onDone={() => setAberto(false)} />
          <div className="um-sep" />
          <button className="um-item danger" onClick={() => logout()}><LogOut size={16} /> Sair</button>
        </div>)}
    </div>
  );
}
