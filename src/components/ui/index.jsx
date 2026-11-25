import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Loader2, Search, X, Inbox, ChevronRight } from 'lucide-react';
import { SLA_ROTULO, slaEstado } from '@/lib/sla';
import { slugStatus } from '@/lib/format';

export { default as PhotoPicker, PhotoGallery } from './Photos';
export { default as NotifyHost } from './NotifyHost';

const cx = (...a) => a.filter(Boolean).join(' ');

/** variant: primary | outline | danger | ghost | success — size: sm | lg — icon: componente lucide */
export function Button({ variant = 'primary', size, icon: Icon, loading, block, children, className, type = 'button', ...rest }) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 size={15} className="spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}
export function IconButton({ icon: Icon, label, variant = 'ghost', className, ...rest }) {
  return <button type="button" aria-label={label} title={label} className={cx('btn', `btn-${variant}`, 'btn-icon', className)} {...rest}><Icon size={16} /></button>;
}

/** tone: blue | green | amber | red | purple | gray */
export function Badge({ tone = 'gray', icon: Icon, children, className, ...rest }) {
  return <span className={cx('badge', `badge-${tone}`, className)} {...rest}>{Icon && <Icon size={12} />}{children}</span>;
}
const STATUS_TOM = { 'A Fazer': 'blue', 'Em Andamento': 'amber', 'Pendente': 'red', 'Concluído': 'green' };
const PRIO_TOM = { 'Baixa': 'blue', 'Média': 'amber', 'Alta': 'red', 'Crítica': 'red' };
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TOM[status] || 'blue'}>{status || '—'}</Badge>;
export const PrioridadeBadge = ({ prioridade }) => <Badge tone={PRIO_TOM[prioridade] || 'gray'}>{prioridade || '—'}</Badge>;
export const StatusPill = ({ status }) => <span className={cx('status-pill', 'status-' + slugStatus(status))}>{status || 'A Fazer'}</span>;
export function SlaBadge({ chamado, overrides }) {
  const e = slaEstado(chamado, overrides);
  return <span className={cx('sla', 'sla-' + e)}><span className="dot" />{SLA_ROTULO[e]}</span>;
}

export function Modal({ title, icon: Icon, onClose, width = 640, children, footer, closeOnOverlay = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (closeOnOverlay && e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal-box" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-header">
          <h3>{Icon && <Icon size={18} />}{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>, document.body);
}

/** <Field label="Nome" required error={..} hint={..}><input className="input" .../></Field> */
export function Field({ label, required, error, hint, children, className }) {
  return (
    <div className={cx('form-group', error && 'has-error', className)}>
      {label && <label>{label}{required && <span className="req"> *</span>}</label>}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions, crumbs }) {
  return (
    <div className="page-head">
      <div>
        {crumbs?.length > 0 && (
          <div className="crumbs">
            {crumbs.map((c, i) => <span key={i} className="row" style={{ gap: 6 }}>{c.to ? <Link to={c.to}>{c.label}</Link> : c.label}{i < crumbs.length - 1 && <ChevronRight size={12} />}</span>)}
          </div>
        )}
        <h1>{Icon && <Icon size={24} />}{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row-wrap">{actions}</div>}
    </div>
  );
}

export const Card = ({ title, icon: Icon, actions, children, className, style }) => (
  <section className={cx('card', className)} style={style}>
    {(title || actions) && <div className="card-title">{Icon && <Icon size={17} />}<span>{title}</span><span className="spacer" />{actions}</div>}
    {children}
  </section>
);

/** tone: blue | green | amber | red | purple */
export function StatCard({ icon: Icon, label, value, tone = 'blue', onClick, hint }) {
  return (
    <div className={cx('stat-card', onClick && 'clicavel')} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}>
      <div className={cx('stat-icon', `tone-${tone}`)}>{Icon && <Icon size={22} />}</div>
      <div><small>{label}</small><strong>{value}</strong>{hint && <span className="text-xs muted">{hint}</span>}</div>
    </div>
  );
}

export const EmptyState = ({ icon: Icon = Inbox, title = 'Nada por aqui', children, action }) => (
  <div className="empty"><Icon />{<h3>{title}</h3>}{children && <p>{children}</p>}{action && <div style={{ marginTop: 14 }}>{action}</div>}</div>
);
export const Spinner = ({ label }) => <div style={{ padding: 36, textAlign: 'center' }}><div className="spinner" />{label && <p className="muted text-sm" style={{ marginTop: 10 }}>{label}</p>}</div>;
export const Skeleton = ({ h = 16, w = '100%', style }) => <div className="skeleton" style={{ height: h, width: w, ...style }} />;

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'ativo' : ''} onClick={() => onChange(t.id)}>
          {t.icon && <t.icon size={14} />}{t.label}{t.count != null && <Badge tone="gray">{t.count}</Badge>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', ...rest }) {
  return (
    <div className="search">
      <Search size={16} />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...rest} />
    </div>
  );
}

export const Avatar = ({ nome, size, className }) => <div className={cx('avatar', size && `avatar-${size}`, className)}>{(nome || '?').trim().charAt(0).toUpperCase()}</div>;

export const Switch = ({ checked, onChange, label }) => (
  <label className="check"><span className="switch"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span /></span>{label}</label>
);
