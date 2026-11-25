import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notify } from '@/lib/notify';

export const LOTE_MAX = 400;

/**
 * Confirmação forte: exige digitar CONFIRMAR (notify.prompt).
 * Resolve true somente se o texto digitado for exatamente "CONFIRMAR".
 */
export async function confirmarForte(texto, titulo) {
  const v = await notify.prompt(`${texto} Para continuar, digite CONFIRMAR.`, {
    titulo, variante: 'danger', placeholder: 'CONFIRMAR', confirmar: 'Prosseguir'
  });
  if (v == null) return false;
  if (v.trim() !== 'CONFIRMAR') { notify.warning('Texto de confirmação incorreto. Nada foi alterado.'); return false; }
  return true;
}

/** Executa operações em writeBatch de no máximo 400 escritas. ops = [(batch) => void]. */
export async function executarEmLotes(ops, onProgress) {
  let feitas = 0;
  for (let i = 0; i < ops.length; i += LOTE_MAX) {
    const lote = writeBatch(db);
    ops.slice(i, i + LOTE_MAX).forEach((fn) => fn(lote));
    await lote.commit();
    feitas = Math.min(i + LOTE_MAX, ops.length);
    onProgress?.(feitas, ops.length);
  }
  return feitas;
}

// ---------------------------------------------------------------- JSON de backup
/** Converte tipos do Firestore em JSON reversível. */
export function serializar(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return { __tipo: 'timestamp', seconds: v.seconds, nanoseconds: v.nanoseconds };
  if (v instanceof Date) return { __tipo: 'timestamp', seconds: Math.floor(v.getTime() / 1000), nanoseconds: 0 };
  if (Array.isArray(v)) return v.map(serializar);
  if (typeof v === 'object') {
    if (typeof v.path === 'string' && v.firestore) return { __tipo: 'ref', path: v.path };
    const o = {};
    for (const [k, x] of Object.entries(v)) { if (x !== undefined) o[k] = serializar(x); }
    return o;
  }
  return v;
}

const soChaves = (o, ks) => { const k = Object.keys(o); return k.length === ks.length && ks.every((x) => k.includes(x)); };

/** Reverte o JSON do backup (inclui o formato antigo {seconds, nanoseconds}). */
export function reviver(v) {
  if (Array.isArray(v)) return v.map(reviver);
  if (v && typeof v === 'object') {
    if (v.__tipo === 'timestamp' && Number.isFinite(v.seconds)) return new Timestamp(v.seconds, v.nanoseconds || 0);
    if (v.__tipo === 'ref' && typeof v.path === 'string') return doc(db, v.path);
    const so = { ...v }; delete so.type;
    if (Number.isFinite(v.seconds) && Number.isFinite(v.nanoseconds) && soChaves(so, ['seconds', 'nanoseconds'])) return new Timestamp(v.seconds, v.nanoseconds);
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = reviver(x);
    return o;
  }
  return v;
}

/** `usuarios` NUNCA entra no backup nem é restaurado: as contas vivem no Firebase Auth. */
export const COLECOES_BACKUP = [
  { id: 'chamados', nome: 'Chamados' },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'arquivos', nome: 'Arquivos (metadados)' },
  { id: 'inventario', nome: 'Inventário' },
  { id: 'estoque', nome: 'Estoque' },
  { id: 'ips_rede', nome: 'IPs e rede', legado: 'ips' },
  { id: 'configuracoes', nome: 'Configurações' }
];
