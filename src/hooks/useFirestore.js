import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { notify } from '@/lib/notify';

/** Explica o erro mais comum de carga de dados (regras não publicadas / índice ausente). */
function avisarErro(error, quem) {
  const c = error?.code || '';
  if (c.includes('permission-denied')) notify.error('Sem permissão para ler estes dados. Publique as regras (firestore.rules) e confira o painel/perfil do usuário.', { titulo: 'Dados bloqueados', chave: 'perm-' + quem });
  else if (c.includes('failed-precondition')) notify.error('Falta um índice do Firestore. Rode: firebase deploy --only firestore:indexes (ou abra o link do erro no console do navegador).', { titulo: 'Índice ausente', chave: 'idx-' + quem });
}

/**
 * Assinatura em tempo real de uma query.
 *   const { data, loading, error } = useCollection(() => query(collection(db,'x'), where(...)), [dep]);
 * Retorne `null` na factory para pausar. Cada item vem como { id, fid, ...campos } (fid = alias legado).
 */
export function useCollection(factory, deps = []) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = factory();
    if (!q) { setState({ data: [], loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, fid: d.id, ...d.data() })), loading: false, error: null }),
      (error) => { console.error('useCollection:', error); avisarErro(error, 'col'); setState({ data: [], loading: false, error }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Assinatura em tempo real de um documento. */
export function useDocument(factory, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const ref = factory();
    if (!ref) { setState({ data: null, loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(ref,
      (s) => setState({ data: s.exists() ? { id: s.id, fid: s.id, ...s.data() } : null, loading: false, error: null }),
      (error) => { console.error('useDocument:', error); setState({ data: null, loading: false, error }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
