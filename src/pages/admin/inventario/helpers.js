import { Monitor, Printer, Phone, Tv, Network, Package } from 'lucide-react';

/** Tipos de equipamento (chaves = campos legados do documento `inventario`). */
export const TIPOS = [
  { id: 'computadores', label: 'Computadores', curto: 'PCs', icon: Monitor, tone: 'blue' },
  { id: 'impressoras', label: 'Impressoras', curto: 'Impressoras', icon: Printer, tone: 'green' },
  { id: 'ramais', label: 'Ramais', curto: 'Ramais', icon: Phone, tone: 'amber' },
  { id: 'tvs', label: 'TVs', curto: 'TVs', icon: Tv, tone: 'purple' },
  { id: 'redes', label: 'Redes', curto: 'Redes', icon: Network, tone: 'red' },
  { id: 'outros', label: 'Outros', curto: 'Outros', icon: Package, tone: 'gray' }
];
export const TIPO_POR_ID = Object.fromEntries(TIPOS.map((t) => [t.id, t]));

export const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : 0; };
export const totalSetor = (i) => TIPOS.reduce((s, t) => s + num(i?.[t.id]), 0);
export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
export const mesmoSetor = (a, b) => norm(a) === norm(b);
export const cmpSetor = (a, b) => String(a.setor || '').localeCompare(String(b.setor || ''), 'pt-BR');
