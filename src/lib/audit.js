import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

let contexto = { nome: null, usuario: null, departamento: null, tipo: null };
/** Chamado pelo AuthContext sempre que o perfil muda. */
export const setAuditContext = (c) => { contexto = { ...contexto, ...c }; };

/**
 * Registra uma ação no log de auditoria (imutável pelas regras do Firestore).
 *   audit('estoque.excluir', { item: 'Toner HP 85A' })
 * Nunca lança erro: auditoria não pode quebrar a operação principal.
 */
export async function audit(acao, detalhe = {}, extras = {}) {
  try {
    const u = auth.currentUser;
    await addDoc(collection(db, 'auditoria'), {
      acao,
      detalhe,
      uid: u?.uid || null,
      autor: contexto.nome || null,
      usuario: contexto.usuario || null,
      departamento: contexto.departamento || null,
      perfil: contexto.tipo || null,
      pagina: typeof location !== 'undefined' ? location.pathname : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
      criadoEm: serverTimestamp(),
      ...extras
    });
  } catch (e) {
    console.warn('[audit] falhou:', acao, e?.code || e);
  }
}
