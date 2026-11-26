import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDate } from '@/lib/format';

/**
 * Espelho PÚBLICO e mínimo de um chamado (coleção tv_chamados/{mesmo id}) usado pelo Painel TV, que não faz login.
 * Não leva nome do solicitante, contato, descrição nem fotos — só tipo de problema, setor, prioridade, status e técnico.
 */
export const espelho = (c) => ({
  departamento: c.departamento || '', protocolo: c.protocolo || '', categoria: c.categoria || (c.tipo === 'chamado' || !c.tipo ? 'Chamado' : String(c.tipo)),
  setor: c.setor || '', prioridade: c.prioridade || 'Média', status: c.status || 'A Fazer', tecnico: c.tecnico || '',
  data_abertura: c.data_abertura || null, data_atualizacao: c.data_atualizacao || c.data_abertura || null, tipo: c.tipo || 'chamado'
});

export const publicarEspelho = (id, c) => setDoc(doc(db, 'tv_chamados', id), espelho(c)).catch((e) => console.warn('tv espelho:', e?.code || e));
export const removerEspelho = (id) => deleteDoc(doc(db, 'tv_chamados', id)).catch(() => {});

const KEY = 'hh_tv_sig';
const sigDe = (c) => { const e = espelho(c); return [e.departamento, e.protocolo, e.categoria, e.setor, e.prioridade, e.status, e.tecnico, toDate(e.data_atualizacao).getTime()].join('|'); };

/** Staff: mantém o espelho em dia (só chamados abertos ou concluídos hoje; pula o que já está sincronizado). */
export function sincronizarEspelhos(lista) {
  let cache = {}; try { cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* */ }
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let mudou = false; let n = 0;
  lista.forEach((c) => {
    if (c.tipo === 'gesthosp' || c.tipo === 'toner' || c.isToner) return;
    const relevante = c.status !== 'Concluído' || toDate(c.data_atualizacao || c.data_abertura) >= hoje;
    if (!relevante) return;
    const s = sigDe(c);
    if (cache[c.id] === s || n >= 60) return;
    n += 1; cache[c.id] = s; mudou = true; publicarEspelho(c.id, c);
  });
  if (mudou) { const ids = new Set(lista.map((c) => c.id)); Object.keys(cache).forEach((k) => { if (!ids.has(k)) delete cache[k]; }); try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* */ } }
}
