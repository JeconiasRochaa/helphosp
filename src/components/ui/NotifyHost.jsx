import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertTriangle, AlertCircle, Info, Zap, X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { notify } from '@/lib/notify';

const ICONES = { success: Check, error: AlertTriangle, warning: AlertCircle, info: Info, critical: Zap };
const TITULOS = { success: 'Tudo certo', error: 'Algo deu errado', warning: 'Atenção', info: 'Informação', critical: 'Urgente' };
const DLG_ICONES = { info: Info, danger: AlertTriangle, warning: AlertCircle, success: Check };

export const useNotifyState = () => useSyncExternalStore(notify.subscribe, notify.getState);

function Toast({ t }) {
  const [saindo, setSaindo] = useState(false);
  const Icon = ICONES[t.tipo] || Info;
  const fechar = () => { setSaindo(true); setTimeout(() => notify.dismiss(t.id), 220); };
  return (
    <div className={`hh-toast ${t.tipo}${saindo ? ' saindo' : ''}`} role={t.tipo === 'error' || t.tipo === 'critical' ? 'alert' : 'status'}>
      <div className="hh-toast__icon"><Icon size={18} /></div>
      <div className="hh-toast__body">
        <div className="hh-toast__title">{t.titulo || TITULOS[t.tipo]}</div>
        {t.mensagem && <div className="hh-toast__msg">{t.mensagem}</div>}
        {t.acao && <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { t.acao.onClick?.(); fechar(); }}>{t.acao.texto}</button>}
      </div>
      <button className="hh-toast__close" aria-label="Fechar" onClick={fechar}><X size={16} /></button>
      {t.duracao > 0 && <div className="hh-toast__bar" style={{ animationDuration: t.duracao + 'ms' }} />}
    </div>
  );
}

function Dialogo({ d }) {
  const [texto, setTexto] = useState(d.valorInicial || '');
  const Icon = DLG_ICONES[d.variante] || (d.tipo === 'prompt' ? HelpCircle : Info);
  const ok = () => { if (d.tipo === 'prompt') { if (d.obrigatorio && !texto.trim()) return; d.resolve(texto.trim()); } else d.resolve(true); };
  const cancelar = () => d.resolve(d.tipo === 'prompt' ? null : false);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') cancelar(); if (e.key === 'Enter' && d.tipo !== 'prompt') ok(); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  });
  return (
    <div className="hh-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && cancelar()}>
      <div className="hh-dialog" role="alertdialog" aria-modal="true" aria-label={d.titulo}>
        <div className="hh-dialog__top"><div className={`hh-dialog__icon ${d.variante}`}><Icon size={22} /></div><div className="hh-dialog__title">{d.titulo}</div></div>
        <div className="hh-dialog__text">{d.texto}</div>
        {d.tipo === 'prompt' && <textarea autoFocus className="textarea" rows={3} value={texto} placeholder={d.placeholder} onChange={(e) => setTexto(e.target.value)} style={{ marginBottom: 14 }} />}
        <div className="hh-dialog__actions">
          {d.tipo !== 'alert' && <button className="btn btn-outline" onClick={cancelar}>{d.cancelar}</button>}
          <button autoFocus={d.tipo !== 'prompt'} className={`btn ${d.variante === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={ok}>{d.confirmar}</button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ l }) {
  const touch = useRef(0);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') notify.fecharLightbox(); if (e.key === 'ArrowLeft') notify.moverLightbox(-1); if (e.key === 'ArrowRight') notify.moverLightbox(1); };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  const multi = l.urls.length > 1;
  return (
    <div className="hh-lightbox" onClick={(e) => e.target === e.currentTarget && notify.fecharLightbox()}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (multi && Math.abs(dx) > 50) notify.moverLightbox(dx > 0 ? -1 : 1); }}>
      <button className="fechar" onClick={notify.fecharLightbox} aria-label="Fechar"><X size={20} /></button>
      {multi && <button className="ant" onClick={() => notify.moverLightbox(-1)} aria-label="Anterior"><ChevronLeft size={22} /></button>}
      <img src={l.urls[l.indice]} alt={`Foto ${l.indice + 1}`} />
      {multi && <button className="prox" onClick={() => notify.moverLightbox(1)} aria-label="Próxima"><ChevronRight size={22} /></button>}
      {multi && <div className="contador">{l.indice + 1} / {l.urls.length}</div>}
    </div>
  );
}

/** Montar uma única vez, na raiz do app. */
export default function NotifyHost() {
  const s = useNotifyState();
  return createPortal(
    <>
      <div className="hh-toast-stack" role="region" aria-label="Notificações" aria-live="polite">{s.toasts.map((t) => <Toast key={t.id} t={t} />)}</div>
      {s.dialog && <Dialogo key={s.dialog.titulo + s.dialog.texto} d={s.dialog} />}
      {s.lightbox && <Lightbox l={s.lightbox} />}
    </>, document.body);
}
