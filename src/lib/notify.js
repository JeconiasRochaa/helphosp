/**
 * HELPHOSP — Central de notificações (store independente do React).
 *
 *   import { notify } from '@/lib/notify';
 *   notify.success('Salvo!');                       // toast
 *   notify.error('Falha ao salvar', { titulo: 'Erro' });
 *   if (await notify.confirm('Excluir?', { variante: 'danger' })) { ... }
 *   notify.lightbox(['url1','url2'], 0);
 *   notify.evento({ nivel:'critical', titulo, mensagem, link:'/admin/chamados/x', chave:'novo-x' }); // toast + sino + push + som
 *
 * O componente <NotifyHost /> (components/ui/NotifyHost.jsx) renderiza tudo.
 */

const PREFS_KEY = 'hh_notif_prefs';
const HIST_MAX = 100;
const TOAST_MAX = 4;

let uid = 'anon';
let seq = 0;
const listeners = new Set();

const lerPrefs = () => {
  try { return { som: true, push: true, toasts: true, ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) }; }
  catch { return { som: true, push: true, toasts: true }; }
};
const lerHist = (u) => {
  try { return JSON.parse(localStorage.getItem('hh_notif_hist_' + u)) || []; } catch { return []; }
};

let state = { toasts: [], dialog: null, lightbox: null, historico: [], prefs: lerPrefs() };

function set(parcial) {
  state = { ...state, ...parcial };
  listeners.forEach((l) => l());
}
const salvarHist = () => {
  try { localStorage.setItem('hh_notif_hist_' + uid, JSON.stringify(state.historico.slice(0, HIST_MAX))); } catch { /* sem storage */ }
};

// ------------------------------------------------------------------ áudio
let ctx = null;
let audioLiberado = false;
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function liberarAudio() { audioLiberado = true; audioCtx(); }
if (typeof document !== 'undefined') {
  ['click', 'keydown', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, liberarAudio, { once: true, passive: true }));
}
function nota(freq, inicio, duracao, volume, tipo = 'sine') {
  const ac = audioCtx(); if (!ac) return;
  const t0 = ac.currentTime + inicio;
  const osc = ac.createOscillator(), gain = ac.createGain(), filtro = ac.createBiquadFilter();
  filtro.type = 'lowpass'; filtro.frequency.value = 4200;
  osc.type = tipo; osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
  osc.connect(filtro); filtro.connect(gain); gain.connect(ac.destination);
  osc.start(t0); osc.stop(t0 + duracao + 0.05);
}
function toque(tipo = 'novo') {
  if (!state.prefs.som || !audioLiberado || !audioCtx()) return;
  switch (tipo) {
    case 'critico': [0, 0.34, 0.68].forEach((t) => { nota(987.77, t, 0.14, 0.32, 'triangle'); nota(1318.51, t + 0.11, 0.18, 0.3, 'triangle'); }); break;
    case 'atrasado': nota(440, 0, 0.26, 0.26, 'triangle'); nota(349.23, 0.28, 0.34, 0.24, 'triangle'); break;
    case 'concluido': nota(659.25, 0, 0.12, 0.2); nota(830.61, 0.1, 0.12, 0.2); nota(1046.5, 0.2, 0.26, 0.2); break;
    case 'erro': nota(392, 0, 0.16, 0.22, 'triangle'); nota(261.63, 0.15, 0.28, 0.2, 'triangle'); break;
    case 'mensagem': nota(880, 0, 0.09, 0.2); nota(1108.73, 0.09, 0.16, 0.2); break;
    default: nota(783.99, 0, 0.13, 0.24); nota(1174.66, 0.12, 0.22, 0.22);
  }
}

// ------------------------------------------------------------------ toasts
const TOM_SOM = { critical: 'critico', error: 'erro', success: 'concluido', warning: 'atrasado', info: 'novo' };

function toast(arg, tipoLegado) {
  const opt = typeof arg === 'string' || typeof arg === 'number'
    ? { mensagem: String(arg), tipo: tipoLegado || 'info' } : (arg || {});
  if (!state.prefs.toasts && !['error', 'critical'].includes(opt.tipo)) return null;

  const tipo = ['success', 'error', 'warning', 'info', 'critical'].includes(opt.tipo) ? opt.tipo : 'info';
  const duracao = opt.duracao === 0 ? 0 : (opt.duracao || (tipo === 'critical' ? 9000 : 4500));
  const mensagem = String(opt.mensagem ?? '').replace(/^\s*[✀-➿-‑-⛿\uD83C-􏰀-\uDFFF]+\s*/u, '').trim();

  // evita repetir o mesmo aviso
  if (opt.chave && state.toasts.some((t) => t.chave === opt.chave)) return null;

  const id = ++seq;
  const item = { id, tipo, titulo: opt.titulo, mensagem, duracao, acao: opt.acao, chave: opt.chave, criadoEm: Date.now() };
  const toasts = [...state.toasts, item].slice(-TOAST_MAX);
  set({ toasts });
  if (opt.som !== false) toque(opt.som || TOM_SOM[tipo]);
  if (duracao) setTimeout(() => dismiss(id), duracao);
  return id;
}
function dismiss(id) { set({ toasts: state.toasts.filter((t) => t.id !== id) }); }

// ------------------------------------------------------------------ diálogos
function dialogo(opt) {
  return new Promise((resolve) => {
    // fila simples: se já existe um diálogo aberto, aguarda
    const abrir = () => set({ dialog: { ...opt, resolve: (v) => { set({ dialog: null }); resolve(v); } } });
    if (state.dialog) { const t = setInterval(() => { if (!state.dialog) { clearInterval(t); abrir(); } }, 120); }
    else abrir();
  });
}
const confirmar = (texto, opt = {}) => dialogo({
  titulo: opt.titulo || 'Confirmar ação', texto, variante: opt.variante || 'danger',
  confirmar: opt.confirmar || 'Confirmar', cancelar: opt.cancelar || 'Cancelar', tipo: 'confirm'
});
const alerta = (texto, opt = {}) => dialogo({
  titulo: opt.titulo || 'Aviso', texto, variante: opt.variante || 'info',
  confirmar: opt.confirmar || 'Entendi', tipo: 'alert'
});
/** Diálogo com campo de texto (ex.: motivo). Resolve com string ou null. */
const perguntar = (texto, opt = {}) => dialogo({
  titulo: opt.titulo || 'Informe', texto, variante: opt.variante || 'info', tipo: 'prompt',
  confirmar: opt.confirmar || 'Confirmar', cancelar: opt.cancelar || 'Cancelar',
  placeholder: opt.placeholder || '', obrigatorio: opt.obrigatorio !== false, valorInicial: opt.valor || ''
});

// ------------------------------------------------------------------ lightbox
const lightbox = (urls, indice = 0) => {
  const lista = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (lista.length) set({ lightbox: { urls: lista, indice: Math.min(Math.max(indice, 0), lista.length - 1) } });
};
const fecharLightbox = () => set({ lightbox: null });
const moverLightbox = (d) => {
  const l = state.lightbox; if (!l) return;
  set({ lightbox: { ...l, indice: (l.indice + d + l.urls.length) % l.urls.length } });
};

// ------------------------------------------------------------------ push do navegador
async function pedirPermissaoPush() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    const r = await Notification.requestPermission();
    if (r === 'granted') toast({ titulo: 'Notificações ativadas', mensagem: 'Você receberá alertas mesmo com a aba em segundo plano.', tipo: 'success' });
    return r;
  } catch { return 'default'; }
}
const permissaoPush = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

function push(titulo, opcoes = {}) {
  if (!state.prefs.push || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const finais = { icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png', vibrate: [180, 90, 180], ...opcoes };
  try {
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then((r) => r.showNotification(titulo, finais));
    else new Notification(titulo, finais);
  } catch { /* silencioso */ }
}

// ------------------------------------------------------------------ eventos (sino)
/**
 * Evento de domínio: aparece no sino, em popup e (se a aba estiver em segundo plano) como push.
 * ev = { nivel: 'info'|'success'|'warning'|'critical', titulo, mensagem, link, chave, categoria, som, toast, push }
 */
function evento(ev) {
  const nivel = ['info', 'success', 'warning', 'critical'].includes(ev.nivel) ? ev.nivel : 'info';
  const item = {
    id: ++seq + '-' + Date.now(), nivel, titulo: ev.titulo, mensagem: ev.mensagem || '', link: ev.link || null,
    categoria: ev.categoria || 'sistema', criadoEm: Date.now(), lida: false, chave: ev.chave || null
  };
  if (item.chave && state.historico.some((h) => h.chave === item.chave)) return null; // dedupe persistente
  set({ historico: [item, ...state.historico].slice(0, HIST_MAX) });
  salvarHist();
  if (ev.toast !== false) {
    toast({
      titulo: item.titulo, mensagem: item.mensagem, tipo: nivel === 'warning' ? 'warning' : nivel,
      duracao: nivel === 'critical' ? 12000 : 7000, som: ev.som || (ev.categoria === 'mensagem' ? 'mensagem' : TOM_SOM[nivel]),
      acao: ev.link && ev.acaoTexto ? { texto: ev.acaoTexto, onClick: () => { notify.navegar?.(ev.link); marcarLida(item.id); } } : undefined
    });
  }
  if (ev.push !== false && typeof document !== 'undefined' && document.hidden) {
    push(item.titulo, { body: item.mensagem, tag: item.chave || item.id, requireInteraction: nivel === 'critical', data: { url: item.link || '/' } });
  }
  return item.id;
}
function marcarLida(id) {
  set({ historico: state.historico.map((h) => (h.id === id ? { ...h, lida: true } : h)) }); salvarHist();
}
function marcarTodasLidas() { set({ historico: state.historico.map((h) => ({ ...h, lida: true })) }); salvarHist(); }
function removerEvento(id) { set({ historico: state.historico.filter((h) => h.id !== id) }); salvarHist(); }
function limparHistorico() { set({ historico: [] }); salvarHist(); }

function setPrefs(p) {
  const prefs = { ...state.prefs, ...p };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* sem storage */ }
  set({ prefs });
}
function setUsuario(novoUid) {
  uid = novoUid || 'anon';
  set({ historico: lerHist(uid) });
}

export const notify = {
  // estado
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  getState: () => state,
  // toasts
  toast, dismiss,
  success: (m, o) => toast({ mensagem: m, tipo: 'success', ...o }),
  error: (m, o) => toast({ mensagem: m, tipo: 'error', ...o }),
  warning: (m, o) => toast({ mensagem: m, tipo: 'warning', ...o }),
  info: (m, o) => toast({ mensagem: m, tipo: 'info', ...o }),
  critical: (m, o) => toast({ mensagem: m, tipo: 'critical', ...o }),
  // diálogos
  confirm: confirmar, alert: alerta, prompt: perguntar,
  // mídia
  lightbox, fecharLightbox, moverLightbox,
  // push / som
  pedirPermissaoPush, permissaoPush, push, toque, liberarAudio,
  // sino
  evento, marcarLida, marcarTodasLidas, removerEvento, limparHistorico,
  // prefs / sessão
  setPrefs, setUsuario,
  /** definido pelo AdminLayout para navegar via react-router a partir de um toast */
  navegar: null
};
