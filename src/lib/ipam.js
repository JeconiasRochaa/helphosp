import { collection, doc, limit, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { audit } from './audit';
import { diff } from './ipamCore';
import { useCollection } from '@/hooks/useFirestore';

export * from './ipamCore';
export { parseCIDR } from './validators';

/** Assina dispositivos e sub-redes em tempo real. */
export function useIpam() {
  const d = useCollection(() => query(collection(db, 'ips_rede')), []);
  const r = useCollection(() => query(collection(db, 'ip_redes')), []);
  return { dispositivos: d.data, redes: r.data.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')), loading: d.loading || r.loading, error: d.error || r.error };
}
export const useHistorico = () => useCollection(() => query(collection(db, 'ip_historico'), orderBy('criadoEm', 'desc'), limit(200)), []);

const hist = (b, perfil, acao, extra) => b.set(doc(collection(db, 'ip_historico')), { acao, autor: perfil.nome, uid: auth.currentUser.uid, criadoEm: serverTimestamp(), ...extra });
const limpo = (d) => { const o = { ...d }; delete o.id; delete o.fid; return o; };

export async function salvarDispositivo(dados, existente, perfil) {
  const b = writeBatch(db);
  const payload = { ...dados, atualizadoEm: serverTimestamp(), atualizadoPor: perfil.nome };
  const ref = existente ? doc(db, 'ips_rede', existente.id) : doc(collection(db, 'ips_rede'));
  if (existente) b.update(ref, payload); else b.set(ref, payload);
  hist(b, perfil, existente ? 'editar' : 'criar', { ipId: ref.id, ip: dados.ip, dispositivo: dados.dispositivo, antes: existente ? limpo(existente) : null, depois: dados, mudancas: existente ? diff(existente, dados) : null });
  await b.commit();
  audit(existente ? 'ip.editar' : 'ip.criar', { ip: dados.ip, dispositivo: dados.dispositivo });
}
export async function excluirDispositivo(d, perfil) {
  const b = writeBatch(db); b.delete(doc(db, 'ips_rede', d.id));
  hist(b, perfil, 'excluir', { ipId: d.id, ip: d.ip, dispositivo: d.dispositivo, antes: limpo(d), depois: null });
  await b.commit(); audit('ip.excluir', { ip: d.ip, dispositivo: d.dispositivo });
}
export async function marcarVerificado(d, perfil) {
  await writeBatch(db).update(doc(db, 'ips_rede', d.id), { ultimaVerificacao: serverTimestamp(), atualizadoPor: perfil.nome }).commit();
}
export async function importarDispositivos(linhas, perfil) {
  for (let i = 0; i < linhas.length; i += 200) {
    const b = writeBatch(db);
    linhas.slice(i, i + 200).forEach((d) => {
      const ref = doc(collection(db, 'ips_rede')); b.set(ref, { ...d, atualizadoEm: serverTimestamp(), atualizadoPor: perfil.nome });
      hist(b, perfil, 'importar', { ipId: ref.id, ip: d.ip, dispositivo: d.dispositivo, antes: null, depois: d });
    });
    await b.commit();
  }
  audit('ip.importar', { qtd: linhas.length });
}
export async function salvarRede(dados, existente, perfil) {
  const ref = existente ? doc(db, 'ip_redes', existente.id) : doc(collection(db, 'ip_redes'));
  const b = writeBatch(db); if (existente) b.update(ref, dados); else b.set(ref, dados); await b.commit();
  audit(existente ? 'ip.rede_editar' : 'ip.rede_criar', { cidr: dados.cidr, nome: dados.nome });
}
export async function excluirRede(r) { const b = writeBatch(db); b.delete(doc(db, 'ip_redes', r.id)); await b.commit(); audit('ip.rede_excluir', { cidr: r.cidr }); }
