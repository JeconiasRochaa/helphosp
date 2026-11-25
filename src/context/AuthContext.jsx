import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, usuarioParaEmail } from '@/lib/firebase';
import { getPerms } from '@/lib/perms';
import { normalizarDepartamento } from '@/lib/format';
import { setAuditContext, audit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { LOGIN_BLOQUEIO_MS, LOGIN_MAX_TENTATIVAS, OCIOSIDADE_MS, SESSAO_MAX_MS } from '@/lib/constants';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const LOCK_KEY = 'hh_login_lock';
const SESS_KEY = 'hh_session_start';
const PAINEL_KEY = 'hh_painel';
const lerPainel = () => { try { return sessionStorage.getItem(PAINEL_KEY) || ''; } catch { return ''; } };

const lerLock = () => { try { return JSON.parse(localStorage.getItem(LOCK_KEY)) || { n: 0, ate: 0 }; } catch { return { n: 0, ate: 0 }; } };
const gravarLock = (l) => { try { localStorage.setItem(LOCK_KEY, JSON.stringify(l)); } catch { /* */ } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);        // undefined = carregando
  const [perfil, setPerfil] = useState(undefined);    // undefined = carregando, null = não é equipe
  const [painel, setPainelState] = useState(lerPainel);   // painel ativo (só administradores alternam)
  const unsubPerfil = useRef(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    unsubPerfil.current?.(); unsubPerfil.current = null;
    setUser(u || null);
    if (!u) { setPerfil(null); return; }
    if (u.isAnonymous) { setPerfil(null); notify.setUsuario('anon-' + u.uid.slice(0, 6)); return; }
    setPerfil(undefined);
    unsubPerfil.current = onSnapshot(doc(db, 'usuarios', u.uid),
      (snap) => {
        const p = snap.exists() ? { id: snap.id, uid: snap.id, ...snap.data() } : null;
        setPerfil(p);
        if (p) { notify.setUsuario(u.uid); setAuditContext({ nome: p.nome, usuario: p.usuario, departamento: p.departamento, tipo: p.tipo }); }
      },
      () => setPerfil(null));
  }, []), []);

  // Todo visitante sem sessão recebe uma identidade anônima (= "este aparelho").
  useEffect(() => {
    if (user === null) signInAnonymously(auth).catch((e) => console.error('Auth anônimo indisponível:', e));
  }, [user]);

  const isStaff = !!user && !user.isAnonymous && !!perfil && perfil.status !== 'inativo';
  const perms = useMemo(() => {
    if (!isStaff) return getPerms(null);
    const efetivo = perfil.tipo === 'admin' && ['TI', 'MANUTENCAO'].includes(painel) ? { ...perfil, departamento: painel } : perfil;
    return getPerms(efetivo);
  }, [perfil, isStaff, painel]);
  const setPainel = useCallback((p) => { setPainelState(p); try { sessionStorage.setItem(PAINEL_KEY, p); } catch { /* */ } }, []);

  const logout = useCallback(async (motivo) => {
    if (isStaff) audit('auth.logout', { motivo: motivo || 'manual' });
    try { sessionStorage.removeItem(SESS_KEY); } catch { /* */ }
    await signOut(auth); // o efeito acima cria um novo aparelho anônimo
  }, [isStaff]);

  const login = useCallback(async (usuario, senha, painelEscolhido) => {
    const lock = lerLock();
    if (lock.ate > Date.now()) {
      const s = Math.ceil((lock.ate - Date.now()) / 1000);
      throw Object.assign(new Error(`Muitas tentativas. Aguarde ${Math.ceil(s / 60)} min.`), { code: 'hh/bloqueado', segundos: s });
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, usuarioParaEmail(usuario), senha);
      gravarLock({ n: 0, ate: 0 });
      try { sessionStorage.setItem(SESS_KEY, String(Date.now())); } catch { /* */ }
      // Cada painel (TI / Manutenção) só aceita membros do próprio departamento; administradores entram em qualquer um.
      if (painelEscolhido) {
        let pf = null;
        try { const snap = await getDoc(doc(db, 'usuarios', cred.user.uid)); pf = snap.exists() ? snap.data() : null; } catch { /* sem perfil */ }
        if (pf && pf.tipo === 'admin') setPainel(painelEscolhido);
        else if (pf && normalizarDepartamento(pf.departamento) !== painelEscolhido) {
          const nome = normalizarDepartamento(pf.departamento) === 'MANUTENCAO' ? 'Manutenção' : 'TI';
          await signOut(auth);
          throw Object.assign(new Error(`Seu usuário pertence ao painel de ${nome}. Selecione o painel correto para entrar.`), { code: 'hh/painel' });
        }
      }
      return cred.user;
    } catch (e) {
      if (e.code === 'hh/painel') throw e;
      const n = (lock.n || 0) + 1;
      gravarLock({ n: n >= LOGIN_MAX_TENTATIVAS ? 0 : n, ate: n >= LOGIN_MAX_TENTATIVAS ? Date.now() + LOGIN_BLOQUEIO_MS : 0 });
      if (auth.currentUser) audit('auth.login_falha', { usuario: String(usuario).slice(0, 40) }, { perfil: 'anonimo' });
      const restantes = LOGIN_MAX_TENTATIVAS - n;
      const msgs = {
        'auth/invalid-credential': 'Usuário ou senha incorretos.', 'auth/wrong-password': 'Usuário ou senha incorretos.',
        'auth/user-not-found': 'Usuário ou senha incorretos.', 'auth/invalid-email': 'Usuário inválido.',
        'auth/too-many-requests': 'Acesso temporariamente bloqueado pelo servidor. Tente em alguns minutos.',
        'auth/network-request-failed': 'Sem conexão com o servidor.', 'auth/user-disabled': 'Conta desativada.'
      };
      let msg = msgs[e.code] || 'Não foi possível entrar.';
      if (e.code === 'auth/invalid-credential' && restantes > 0 && restantes <= 2) msg += ` (${restantes} tentativa(s) restante(s))`;
      if (n >= LOGIN_MAX_TENTATIVAS) msg = `Muitas tentativas. Acesso bloqueado por ${LOGIN_BLOQUEIO_MS / 60000} min.`;
      throw Object.assign(new Error(msg), { code: e.code });
    }
  }, []);

  const trocarSenha = useCallback(async (atual, nova) => {
    const u = auth.currentUser;
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, atual));
    await updatePassword(u, nova);
    await updateDoc(doc(db, 'usuarios', u.uid), { primeiro_acesso: false, senhaAlteradaEm: serverTimestamp() });
    audit('auth.senha_alterada');
  }, []);

  // Sessão máxima + inatividade
  useEffect(() => {
    if (!isStaff) return undefined;
    let inicio = Number(sessionStorage.getItem(SESS_KEY)) || 0;
    if (!inicio) { inicio = Date.now(); try { sessionStorage.setItem(SESS_KEY, String(inicio)); } catch { /* */ } }
    let ultimo = Date.now();
    let avisou = false;
    const mexeu = () => { ultimo = Date.now(); avisou = false; };
    const evs = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, mexeu, { passive: true }));
    const t = setInterval(() => {
      if (Date.now() - inicio > SESSAO_MAX_MS) { notify.alert('Sua sessão expirou. Entre novamente.', { titulo: 'Sessão expirada', variante: 'warning' }); logout('sessao_expirada'); return; }
      const ocioso = Date.now() - ultimo;
      if (ocioso > OCIOSIDADE_MS) { notify.alert('Você ficou inativo por muito tempo e foi desconectado por segurança.', { titulo: 'Desconectado por inatividade', variante: 'warning' }); logout('inatividade'); }
      else if (ocioso > OCIOSIDADE_MS - 60000 && !avisou) { avisou = true; notify.warning('Você será desconectado em 1 minuto por inatividade.', { titulo: 'Sessão prestes a expirar' }); }
    }, 15000);
    return () => { clearInterval(t); evs.forEach((e) => window.removeEventListener(e, mexeu)); };
  }, [isStaff, logout]);

  const value = useMemo(() => ({
    user, perfil: isStaff ? perfil : null, perms, isStaff,
    deviceUid: user?.uid || null,
    carregando: user === undefined || (user && !user.isAnonymous && perfil === undefined),
    contaSemPerfil: !!user && !user.isAnonymous && perfil === null,
    painel: perms.dep || painel, setPainel,
    login, logout, trocarSenha
  }), [user, perfil, isStaff, perms, painel, setPainel, login, logout, trocarSenha]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
