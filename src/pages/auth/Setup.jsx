import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ShieldCheck } from 'lucide-react';
import { auth, db, usuarioParaEmail } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, Spinner } from '@/components/ui';
import { MedidorSenha } from './TrocarSenha';
import { erroSenha } from '@/lib/validators';
import { notify } from '@/lib/notify';

/** Instalação inicial: cria o PRIMEIRO administrador. Fica bloqueada depois que configuracoes/bootstrap existe. */
export default function Setup() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [livre, setLivre] = useState(null);
  const [falhaLeitura, setFalhaLeitura] = useState('');
  const [f, setF] = useState({ nome: '', usuario: 'admin', senha: '', conf: '', departamento: 'TI', whatsapp: '' });
  const [busy, setBusy] = useState(false); const [erro, setErro] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'configuracoes', 'bootstrap')).then((s) => setLivre(!s.exists())).catch((e) => { setFalhaLeitura(e?.code || e?.message || 'erro'); setLivre(false); });
  }, [user]);

  async function criar(e) {
    e.preventDefault(); setErro('');
    if (!f.nome.trim() || !/^[a-z0-9._-]{3,30}$/.test(f.usuario)) return setErro('Informe o nome e um usuário (3–30 caracteres: letras minúsculas, números, ponto, hífen).');
    const m = erroSenha(f.senha); if (m) return setErro(m);
    if (f.senha !== f.conf) return setErro('A confirmação não confere.');
    setBusy(true);
    try {
      await signOut(auth);
      const cred = await createUserWithEmailAndPassword(auth, usuarioParaEmail(f.usuario), f.senha);
      const uid = cred.user.uid;
      const b = writeBatch(db);
      b.set(doc(db, 'usuarios', uid), { uid, nome: f.nome.trim(), usuario: f.usuario, cargo: 'Administrador', tipo: 'admin', departamento: f.departamento, whatsapp: f.whatsapp, mostrarContato: false, status: 'ativo', primeiro_acesso: false, criadoEm: serverTimestamp() });
      b.set(doc(db, 'configuracoes', 'bootstrap'), { criadoEm: serverTimestamp(), por: uid });
      await b.commit();
      await signInWithEmailAndPassword(auth, usuarioParaEmail(f.usuario), f.senha);
      notify.success('Administrador criado. Sistema pronto para uso!');
      nav('/admin', { replace: true });
    } catch (err) {
      setErro(err.code === 'auth/email-already-in-use' ? 'Esse usuário já existe no Firebase Auth. Escolha outro.' : err.code === 'auth/operation-not-allowed' ? 'Ative o provedor "E-mail/senha" no Firebase Authentication.' : 'Falha na instalação: ' + (err.code || err.message));
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <div className="auth-form-side" style={{ background: 'var(--bg)' }}>
        <div className="auth-box card stack" style={{ padding: 26, gap: 14 }}>
          <div className="row"><div className="avatar"><ShieldCheck size={18} /></div><div><h2 style={{ fontSize: 19 }}>Instalação inicial</h2><p className="muted text-sm">Criar o primeiro administrador</p></div></div>
          {livre === null ? <Spinner /> : !livre ? (
            <>{falhaLeitura ? (
              <div className="badge badge-red" style={{ padding: 12, whiteSpace: 'normal', borderRadius: 10, display: 'block' }}>
                <strong>Não foi possível verificar a instalação</strong> ({falhaLeitura}).<br />
                Confira no console do Firebase: (1) o <b>Firestore Database</b> foi criado; (2) as regras foram publicadas (<code>firebase deploy --only firestore:rules</code>); (3) o login <b>Anônimo</b> está ativado em Authentication.
              </div>
            ) : <div className="badge badge-amber" style={{ padding: 12, whiteSpace: 'normal', borderRadius: 10 }}>O sistema já foi instalado (existe o documento configuracoes/bootstrap). Entre pelo login ou crie o administrador manualmente no console.</div>}<Link className="btn btn-primary" to="/login">Ir para o login</Link></>
          ) : (
            <form className="stack" onSubmit={criar}>
              {erro && <div role="alert" className="badge badge-red" style={{ padding: 10, whiteSpace: 'normal', borderRadius: 10 }}>{erro}</div>}
              <Field label="Nome completo" required><input className="input" value={f.nome} onChange={set('nome')} /></Field>
              <div className="form-row">
                <Field label="Usuário" required><input className="input" value={f.usuario} onChange={(e) => setF((s) => ({ ...s, usuario: e.target.value.toLowerCase() }))} /></Field>
                <Field label="Departamento"><select className="select" value={f.departamento} onChange={set('departamento')}><option value="TI">TI</option><option value="MANUTENCAO">Manutenção</option></select></Field>
              </div>
              <Field label="Senha" required hint="Mínimo 8 caracteres, letras e números."><input className="input" type="password" autoComplete="new-password" value={f.senha} onChange={set('senha')} /><MedidorSenha valor={f.senha} /></Field>
              <Field label="Confirmar senha" required><input className="input" type="password" autoComplete="new-password" value={f.conf} onChange={set('conf')} /></Field>
              <Button type="submit" loading={busy} block>Criar administrador</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
