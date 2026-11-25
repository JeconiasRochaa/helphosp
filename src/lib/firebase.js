import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

/**
 * Área técnica (login/admin/tv) = sessão POR ABA/JANELA (sessionStorage): abrir outra janela não herda o login
 * e cada janela pode entrar com um usuário/painel diferente.
 * Portal público = identidade do APARELHO (Auth anônimo persistente), para manter a privacidade dos chamados.
 */
export const AREA_TECNICA = typeof location !== 'undefined' && /^\/(admin|login|setup|tv|trocar-senha)(\/|$)/.test(location.pathname);
function iniciarApp() {
  if (!AREA_TECNICA) return getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
  return getApps().find((a) => a.name === 'tecnico') || initializeApp(firebaseConfig, 'tecnico');
}
export const app = iniciarApp();
function iniciarAuth() {
  if (!AREA_TECNICA) return getAuth(app);
  try { return initializeAuth(app, { persistence: [browserSessionPersistence, inMemoryPersistence] }); } catch { return getAuth(app); }
}
export const auth = iniciarAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
// Se o Storage estiver indisponível/bloqueado, falha rápido (padrão = 10 min) para acionar o modo compatível.
storage.maxUploadRetryTime = 20000; storage.maxOperationRetryTime = 20000;

/** Sufixo do "e-mail" fictício que representa o usuário no Firebase Auth. */
export const AUTH_SUFFIX = env.VITE_AUTH_DOMAIN_SUFFIX || 'helphosp.app';
/** "Edson Silva" → edson.silva@helphosp.app · e-mail completo é aceito como está. */
export const usuarioParaEmail = (usuario) => {
  const bruto = String(usuario || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (bruto.includes('@')) return bruto.replace(/\s+/g, '');
  return `${bruto.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '')}@${AUTH_SUFFIX}`;
};

/**
 * App secundário: permite que um administrador crie a conta de outro membro
 * sem perder a própria sessão (o app principal continua logado).
 */
export function getSecondaryAuth() {
  const nome = 'secondary';
  const sec = getApps().find((a) => a.name === nome) || initializeApp(firebaseConfig, nome);
  return getAuth(sec);
}
