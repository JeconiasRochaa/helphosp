import { Timestamp } from 'firebase/firestore';

export const toDate = (d) => {
  if (!d) return new Date(0);
  if (d instanceof Date) return d;
  if (typeof d.toDate === 'function') return d.toDate();
  if (typeof d.seconds === 'number') return new Date(d.seconds * 1000);
  return new Date(d);
};

export const isValidDate = (d) => d && !isNaN(toDate(d).getTime()) && toDate(d).getTime() > 0;
export const nowTs = () => Timestamp.now();
export const tsFromDate = (d) => Timestamp.fromDate(d);

export function fmtData(d) {
  if (!isValidDate(d)) return '—';
  const dt = toDate(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function fmtDia(d) {
  if (!isValidDate(d)) return '—';
  return toDate(d).toLocaleDateString('pt-BR');
}
export function fmtHora(d) {
  if (!isValidDate(d)) return '—';
  return toDate(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
/** "agora", "5 min", "3 h", "2 d" */
export function fmtRelativo(d) {
  if (!isValidDate(d)) return '—';
  const diff = Math.floor((Date.now() - toDate(d).getTime()) / 1000);
  if (diff < 45) return 'agora';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + ' h';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' d';
  return fmtDia(d);
}
export function fmtDuracao(ms) {
  const neg = ms < 0; ms = Math.abs(ms);
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const t = d > 0 ? `${d}d ${h % 24}h` : h > 0 ? `${h}h ${m % 60}min` : `${m}min`;
  return (neg ? '-' : '') + t;
}

export function normalizarDepartamento(v) {
  const s = String(v || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('MANUT')) return 'MANUTENCAO';
  if (s === 'TI' || s.includes('TECNOLOGIA') || s.includes('INFORMATICA')) return 'TI';
  return s;
}
/** Formas como o departamento pode estar gravado nos dados (inclui registros do sistema antigo). */
const VARIANTES = {
  TI: ['TI', 'ti', 'Ti', 'T.I.', 'T.I', 'Tecnologia da Informação', 'TECNOLOGIA DA INFORMAÇÃO', 'Tecnologia da Informacao', 'TECNOLOGIA', 'Informática', 'INFORMÁTICA'],
  MANUTENCAO: ['MANUTENCAO', 'MANUTENÇÃO', 'Manutenção', 'Manutencao', 'manutencao', 'manutenção', 'Manutenção Predial', 'MANUTENÇÃO PREDIAL']
};
export const depVariantes = (dep) => VARIANTES[normalizarDepartamento(dep)] || [String(dep || '')];
export const nomeDepartamento = (dep) =>
  normalizarDepartamento(dep) === 'TI' ? 'Tecnologia da Informação'
    : normalizarDepartamento(dep) === 'MANUTENCAO' ? 'Manutenção' : String(dep || '');

export const somenteDigitos = (s) => String(s || '').replace(/\D/g, '');
export const linkWhatsApp = (numero, texto) => {
  const n = somenteDigitos(numero);
  if (n.length < 10) return null;
  const full = n.startsWith('55') && n.length >= 12 ? n : '55' + n;
  return `https://wa.me/${full}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');
};

export const mascaraTelefone = (v) => {
  v = somenteDigitos(v).slice(0, 11);
  if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return v;
};
export const mascaraCPF = (v) => {
  v = somenteDigitos(v).slice(0, 11);
  return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};
export const mascaraCEP = (v) => {
  v = somenteDigitos(v).slice(0, 8);
  return v.length > 5 ? v.replace(/(\d{5})(\d{0,3})/, '$1-$2') : v;
};

export function validarCPF(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (soma * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (soma * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

export const slugStatus = (s) =>
  String(s || 'A Fazer').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s/g, '');

/** Baixa um arquivo de texto (CSV/JSON) no navegador. */
export function baixarArquivo(nome, conteudo, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function paraCSV(linhas, colunas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cab = colunas.map((c) => esc(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => esc(typeof c.valor === 'function' ? c.valor(l) : l[c.valor])).join(';'));
  return '﻿' + [cab, ...corpo].join('\r\n');
}

/** Baixa uma imagem (URL http, blob ou data URL). Se o servidor bloquear o download direto, abre em nova aba. */
export async function baixarImagem(url, nome = 'foto') {
  const ext = (m) => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[m] || 'jpg');
  try {
    const r = await fetch(url); const b = await r.blob();
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = `${nome}.${ext(b.type)}`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  } catch {
    const a = document.createElement('a'); a.href = url; a.download = `${nome}.jpg`; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  }
}
