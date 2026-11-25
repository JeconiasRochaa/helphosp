import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, Ticket } from 'lucide-react';
import { TODOS_ITENS } from './nav';
import { useAuth } from '@/context/AuthContext';
import { useChamados } from '@/context/ChamadosContext';

/** Ctrl/⌘+K: navegação rápida + busca de chamados por protocolo, título ou solicitante. */
export default function CommandPalette({ aberto, onClose }) {
  const nav = useNavigate();
  const { perms } = useAuth();
  const { tickets } = useChamados();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef(null);
  useEffect(() => { if (aberto) { setQ(''); setSel(0); setTimeout(() => input.current?.focus(), 30); } }, [aberto]);

  const itens = useMemo(() => {
    const t = q.trim().toLowerCase();
    const paginas = TODOS_ITENS.filter((i) => !i.externo && (!i._perm || i._perm(perms)) && (!t || i.label.toLowerCase().includes(t)))
      .slice(0, t ? 6 : 12).map((i) => ({ k: 'p' + i.to + i.label, label: i.label, icon: i.icon, to: i.to, tipo: 'Ir para' }));
    const chs = t.length >= 2 ? tickets.filter((c) => [c.protocolo, c.titulo, c.solicitante, c.setor].some((v) => String(v || '').toLowerCase().includes(t)))
      .slice(0, 6).map((c) => ({ k: 'c' + c.id, label: `${c.protocolo} — ${c.titulo}`, icon: Ticket, to: `/admin/chamados/${c.id}`, tipo: c.status })) : [];
    return [...chs, ...paginas];
  }, [q, perms, tickets]);

  if (!aberto) return null;
  const ir = (i) => { onClose(); nav(i.to); };
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} style={{ paddingTop: '12vh' }}>
      <div className="modal-box" style={{ maxWidth: 560 }} role="dialog" aria-label="Busca rápida">
        <div className="row" style={{ paddingLeft: 16 }}><Search size={18} className="muted" />
          <input ref={input} className="palette-input" placeholder="Buscar páginas e chamados…" value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, itens.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && itens[sel]) ir(itens[sel]);
            }} />
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 0' }}>
          {itens.length === 0 && <div className="empty" style={{ padding: 24 }}>Nada encontrado.</div>}
          {itens.map((i, idx) => (
            <div key={i.k} className={'palette-item' + (idx === sel ? ' ativo' : '')} onMouseEnter={() => setSel(idx)} onClick={() => ir(i)}>
              <i.icon size={16} className="muted" /><span style={{ flex: 1 }}>{i.label}</span><span className="text-xs muted">{i.tipo}</span>
            </div>
          ))}
        </div>
      </div>
    </div>, document.body);
}
