import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Check, CheckCheck, Trash2, Volume2, VolumeX, MonitorSmartphone, Play, Upload, TicketPlus, MessageSquare, Clock, ShieldAlert, Info } from 'lucide-react';
import { notify, TOQUES } from '@/lib/notify';
import { fmtRelativo } from '@/lib/format';
import { useNotifyState } from './NotifyHost';

const TOM = { info: 'blue', success: 'green', warning: 'amber', critical: 'red' };
const ICO = { chamado: TicketPlus, mensagem: MessageSquare, sla: Clock, seguranca: ShieldAlert, sistema: Info };

/** Sino da barra superior: histórico persistente, não lidas, preferências de som/push. */
export default function NotificationBell() {
  const s = useNotifyState();
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState('todas');
  const ref = useRef(null);
  const arq = useRef(null);
  const naoLidas = s.historico.filter((h) => !h.lida).length;
  const perm = notify.permissaoPush();

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!ref.current?.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora); return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const lista = s.historico.filter((h) => filtro === 'todas' || (filtro === 'nao' ? !h.lida : h.categoria === filtro));
  const abrir = (h) => { notify.marcarLida(h.id); setAberto(false); if (h.link) nav(h.link); };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ''}`} aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        {naoLidas ? <BellRing size={18} /> : <Bell size={18} />}{naoLidas > 0 && <span className="pip">{naoLidas > 99 ? '99+' : naoLidas}</span>}
      </button>
      {aberto && (
        <div className="notif-panel" role="dialog" aria-label="Central de notificações">
          <div className="notif-head">
            <strong>Notificações</strong>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn btn-ghost btn-icon" title={s.prefs.som ? 'Silenciar sons' : 'Ativar sons'} onClick={() => notify.setPrefs({ som: !s.prefs.som })}>{s.prefs.som ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
              <button className="btn btn-ghost btn-icon" title="Marcar todas como lidas" onClick={notify.marcarTodasLidas}><CheckCheck size={16} /></button>
              <button className="btn btn-ghost btn-icon" title="Limpar histórico" onClick={notify.limparHistorico}><Trash2 size={16} /></button>
            </div>
          </div>
          <div style={{ padding: '10px 16px 0' }}>
            <div className="tabs">{[['todas', 'Todas'], ['nao', 'Não lidas'], ['chamado', 'Chamados'], ['mensagem', 'Mensagens'], ['sla', 'SLA']].map(([id, l]) => <button key={id} className={filtro === id ? 'ativo' : ''} onClick={() => setFiltro(id)}>{l}</button>)}</div>
          </div>
          {perm === 'default' && (
            <div className="aviso-device" style={{ margin: '10px 16px 0' }}>
              <MonitorSmartphone size={16} style={{ flex: 'none' }} />
              <div>Receba alertas mesmo com o sistema em segundo plano. <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }} onClick={() => notify.pedirPermissaoPush()}>Ativar notificações do navegador</button></div>
            </div>
          )}
          {perm === 'denied' && <div className="text-xs muted" style={{ padding: '8px 16px 0' }}>Notificações do navegador bloqueadas. Libere nas configurações do site para receber alertas em segundo plano.</div>}
          <div className="toque-box">
            <div className="row" style={{ gap: 8 }}>
              <label className="text-xs muted" htmlFor="sel-toque" style={{ flex: 'none' }}>Toque</label>
              <select id="sel-toque" className="select" style={{ height: 30, fontSize: 12.5, flex: 1 }} value={s.prefs.toque || 'padrao'} onChange={(e) => { notify.setPrefs({ toque: e.target.value }); notify.testarToque(e.target.value); }}>
                {Object.entries(TOQUES).map(([id, t]) => <option key={id} value={id}>{t.nome}</option>)}
              </select>
              <button className="btn btn-ghost btn-icon" title="Ouvir" onClick={() => notify.testarToque(s.prefs.toque || 'padrao')}><Play size={15} /></button>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <Volume2 size={14} className="muted" />
              <input type="range" min="0.1" max="1" step="0.05" value={s.prefs.volume ?? 1} onChange={(e) => notify.setPrefs({ volume: Number(e.target.value) })} style={{ flex: 1 }} aria-label="Volume" />
              <button className="btn btn-ghost btn-sm" onClick={() => arq.current?.click()}><Upload size={13} /> Meu som</button>
              <input ref={arq} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 600 * 1024) return notify.warning('Use um arquivo de som de até 600 KB.'); const r = new FileReader(); r.onload = () => { notify.setPrefs({ somCustom: r.result, toque: 'personalizado' }); notify.testarToque('personalizado'); }; r.readAsDataURL(f); }} />
            </div>
          </div>
          <div className="notif-list" style={{ marginTop: 10 }}>
            {lista.length === 0 && <div className="empty" style={{ padding: 30 }}><Bell /><p>Nenhuma notificação por aqui.</p></div>}
            {lista.map((h) => {
              const Ico = ICO[h.categoria] || Info;
              return (
                <div key={h.id} className={'notif-item' + (h.lida ? '' : ' nova')} onClick={() => abrir(h)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && abrir(h)}>
                  <div className={`notif-ico tone-${TOM[h.nivel]}`}><Ico size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{h.titulo}</div>
                    {h.mensagem && <div className="text-sm muted" style={{ wordBreak: 'break-word' }}>{h.mensagem}</div>}
                    <div className="text-xs muted" style={{ marginTop: 3 }}>{fmtRelativo(new Date(h.criadoEm))}</div>
                  </div>
                  {!h.lida && <button className="btn btn-ghost btn-icon" title="Marcar como lida" onClick={(e) => { e.stopPropagation(); notify.marcarLida(h.id); }}><Check size={14} /></button>}
                </div>
              );
            })}
          </div>
          <div className="notif-foot text-xs muted"><span>{s.historico.length} no histórico</span><span>Som: {s.prefs.som ? 'ligado' : 'desligado'}</span></div>
        </div>
      )}
    </div>
  );
}
