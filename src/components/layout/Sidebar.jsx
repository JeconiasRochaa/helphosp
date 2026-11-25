import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, ExternalLink, Monitor, PanelLeftClose, PanelLeftOpen, ShieldPlus, Wrench } from 'lucide-react';
import { MENU } from './nav';
import { useAuth } from '@/context/AuthContext';
import { useChamados } from '@/context/ChamadosContext';
import { useConfig } from '@/context/ConfigContext';
import { slaEstado } from '@/lib/sla';
import Mascote from './Mascote';

const COR = '#5b9bff';
const CORES = new Proxy({}, { get: () => COR });
const cx = (...a) => a.filter(Boolean).join(' ');
const pathDe = (to) => to.split('?')[0];

export default function Sidebar({ recolhido, onToggle, onNavigate, badges }) {
  const { perms } = useAuth();
  const loc = useLocation();
  const [abertos, setAbertos] = useState(() => { try { return JSON.parse(localStorage.getItem('hh_menu_abertos')) || {}; } catch { return {}; } });

  const grupos = useMemo(() => MENU.filter((g) => !g.perm || g.perm(perms)), [perms]);

  // abre automaticamente o grupo da rota atual
  useEffect(() => {
    grupos.forEach((g) => g.itens.forEach((i) => {
      if (i.children && loc.pathname.startsWith(pathDe(i.to)) && !abertos[i.id]) setAbertos((a) => ({ ...a, [i.id]: true }));
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);
  useEffect(() => { try { localStorage.setItem('hh_menu_abertos', JSON.stringify(abertos)); } catch { /* */ } }, [abertos]);

  const ativoSub = (c) => {
    const [p, q] = c.to.split('?');
    if (loc.pathname !== p && !(!c.end && loc.pathname.startsWith(p + '/'))) return false;
    const f = new URLSearchParams(loc.search).get('f');
    const fc = q ? new URLSearchParams(q).get('f') : null;
    return p === '/admin/chamados' ? f === fc : true;
  };

  const Badge = ({ k, tom }) => (badges[k] > 0 ? <span className={cx('sb-badge', tom === 'azul' && 'azul')}>{badges[k] > 99 ? '99+' : badges[k]}</span> : null);

  return (
    <aside className="sidebar" aria-label="Menu principal">
      <div className="sb-brand">
        <div className="sb-logo"><ShieldPlus size={22} color="#fff" /></div>
        <div><strong>HelpHosp</strong><small>Central de chamados</small></div>
      </div>
      <div className={`sb-painel ${perms.isManut ? 'manut' : 'ti'}`} title={`Painel de ${perms.isManut ? 'Manutenção' : 'TI'}`}>
        {perms.isManut ? <Wrench size={15} /> : <Monitor size={15} />}
        <div className="lbl"><small>Painel</small><strong>{perms.isManut ? 'Manutenção' : 'Tecnologia da Informação'}</strong></div>
      </div>
      <nav className="sb-nav">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="sb-title">{g.titulo}</div>
            {g.itens.map((i) => {
              const Icon = (!perms.isAdmin && i.iconAlt) || i.icon;
              const label = i.permLabel ? i.permLabel(perms) : i.label;
              if (i.children) {
                const aberto = !!abertos[i.id] && !recolhido;
                const temAtivo = loc.pathname.startsWith(pathDe(i.to));
                return (
                  <div key={i.id} className={cx('sb-group', aberto && 'aberto', temAtivo && 'tem-ativo')} style={{ '--c': CORES[i.id] }}>
                    <button className="sb-group-btn" title={label} aria-expanded={aberto}
                      onClick={() => (recolhido ? (onToggle(), setAbertos((a) => ({ ...a, [i.id]: true }))) : setAbertos((a) => ({ ...a, [i.id]: !a[i.id] })))}>
                      <span className="sb-ico"><Icon /></span><span className="lbl">{label}</span><Badge k={i.badge} /><ChevronRight className="sb-chevron" />
                    </button>
                    <div className="sb-sub"><div className="sb-sub-in">
                      {i.children.map((c) => (
                        <NavLink key={c.to} to={c.to} onClick={onNavigate} className={cx('sb-item', ativoSub(c) && 'ativo')} tabIndex={aberto ? 0 : -1}>
                          <c.icon size={15} /><span className="lbl">{c.label}</span><Badge k={c.badge} />
                        </NavLink>
                      ))}
                    </div></div>
                  </div>
                );
              }
              if (i.externo) return (
                <a key={i.id} style={{ '--c': CORES[i.id] }} className="sb-item" href={i.to + `?dep=${perms.dep}`} target="_blank" rel="noopener noreferrer" title={label}>
                  <span className="sb-ico"><Icon /></span><span className="lbl">{label}</span><ExternalLink size={13} style={{ opacity: .5 }} />
                </a>
              );
              return (
                <NavLink key={i.id} style={{ '--c': CORES[i.id] }} to={i.to} end={i.end} onClick={onNavigate} title={label} className={({ isActive }) => cx('sb-item', isActive && 'ativo')}>
                  <span className="sb-ico"><Icon /></span><span className="lbl">{label}</span><Badge k={i.badge} />
                  {loc.pathname === pathDe(i.to) || (!i.end && loc.pathname.startsWith(pathDe(i.to) + '/')) ? <Mascote /> : null}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <button className="sb-collapse" onClick={onToggle} title={recolhido ? 'Expandir menu' : 'Recolher menu'}>
          {recolhido ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}<span className="lbl">Recolher menu</span>
        </button>
        <span className="sb-versao lbl">v4.0</span>
      </div>
    </aside>
  );
}

export function useBadges() {
  const { abertos, chamados } = useChamados();
  const { sla } = useConfig();
  return useMemo(() => ({
    abertos: abertos.length,
    atrasados: abertos.filter((c) => slaEstado(c, sla) === 'critical').length,
    gesthosp: chamados.filter((c) => c.tipo === 'gesthosp' && c.status !== 'Concluído').length
  }), [abertos, chamados, sla]);
}
