import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { depVariantes } from '@/lib/format';

export const TURNOS = [
  { id: 'Manhã', h: '07h–13h', cor: '#F59E0B' },
  { id: 'Tarde', h: '13h–19h', cor: '#2F6FED' },
  { id: 'Noite', h: '19h–07h', cor: '#7C5CFC' },
  { id: 'Dia todo', h: '07h–19h', cor: '#10B981' },
  { id: 'Plantão 12h', h: '12 horas', cor: '#EF4444' }
];
export const turnoDe = (id) => TURNOS.find((t) => t.id === id) || { id, h: '', cor: '#64748B' };
const p2 = (n) => String(n).padStart(2, '0');
export const isoDia = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const isoMes = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
export const daISO = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };

/** Profissionais cadastrados (ativos primeiro, por nome). */
export function useProfissionais(dep) {
  const r = useCollection(() => (dep ? query(collection(db, 'profissionais'), where('departamento', 'in', depVariantes(dep))) : null), [dep]);
  const data = [...r.data].sort((a, b) => (b.ativo !== false) - (a.ativo !== false) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return { ...r, data };
}
/** Lançamentos da escala de um mês (YYYY-MM). */
export function useEscalaMes(dep, mes) {
  return useCollection(() => (dep ? query(collection(db, 'escala'), where('departamento', 'in', depVariantes(dep)), where('mes', '==', mes)) : null), [dep, mes]);
}
