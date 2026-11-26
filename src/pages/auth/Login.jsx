import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Eye, EyeOff, Lock, Monitor, ShieldCheck, ShieldPlus, User, Wrench } from 'lucide-react';
import { db } from '@/lib/firebase';
import InstallButton from '@/components/InstallButton';
import { useAuth } from '@/context/AuthContext';
import { Button, Field } from '@/components/ui';
import { notify } from '@/lib/notify';

export default function Login() {
  const { login, isStaff, perfil, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const lembrado = () => { try { return localStorage.getItem('hh_login_usuario') || ''; } catch { return ''; } };
  const [usuario, setUsuario] = useState(lembrado);
  const [lembrar, setLembrar] = useState(() => !!lembrado());
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [painel, setPainel] = useState(() => { try { return localStorage.getItem('hh_painel_login') || 'TI'; } catch { return 'TI'; } });
  const [semAdmin, setSemAdmin] = useState(false);
  useEffect(() => { // instalação nova: ainda não existe administrador
    if (!user) return;
    getDoc(doc(db, 'configuracoes', 'bootstrap')).then((s) => setSemAdmin(!s.exists())).catch(() => {});
  }, [user]);
  const escolher = (p) => { setPainel(p); setErro(''); try { localStorage.setItem('hh_painel_login', p); } catch { /* */ } };

  if (isStaff) return <Navigate to={perfil?.primeiro_acesso ? '/trocar-senha' : (loc.state?.de || '/admin')} replace />;

  async function entrar(e) {
    e.preventDefault();
    if (!usuario.trim() || !senha) { setErro('Informe usuário e senha.'); return; }
    setBusy(true); setErro('');
    try {
      await login(usuario, senha, painel);
      try { if (lembrar) localStorage.setItem('hh_login_usuario', usuario.trim()); else localStorage.removeItem('hh_login_usuario'); } catch { /* */ }
      // pede ao navegador para guardar usuário + senha (gerenciador de senhas) — a senha nunca é guardada pelo sistema
      try { if (lembrar && window.PasswordCredential) await navigator.credentials.store(new window.PasswordCredential({ id: usuario.trim(), password: senha, name: usuario.trim() })); } catch { /* */ } notify.success('Bem-vindo de volta!', { som: false }); nav(loc.state?.de || '/admin', { replace: true });
    }
    catch (err) { setErro(err.message); setSenha(''); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-showcase">
        <div className="row" style={{ gap: 12 }}>
          <div className="sb-logo"><ShieldPlus size={22} color="#fff" /></div>
          <div><strong style={{ fontSize: 20 }}>HelpHosp</strong><div className="text-xs" style={{ opacity: .6 }}>Central de chamados hospitalar</div></div>
        </div>
        <div>
          <h1 style={{ fontSize: 38, lineHeight: 1.15, letterSpacing: '-.03em', fontWeight: 800 }}>Tecnologia e manutenção<br />a serviço de quem cuida.</h1>
          <p style={{ opacity: .7, marginTop: 14, maxWidth: 420 }}>Acompanhe chamados em tempo real, controle prazos de SLA e mantenha a rede e os equipamentos do hospital sob controle.</p>
        </div>
        <div className="auth-collage" aria-hidden="true">
          <img className="c1" src="/img/ti.jpg" alt="" /><img className="c2" src="/img/manutencao.jpg" alt="" /><img className="c3" src="/img/chamados.jpg" alt="" />
        </div>
        <div className="row" style={{ opacity: .65, fontSize: 12.5 }}><ShieldCheck size={16} /> Acesso protegido por autenticação, sessão com expiração e registro de auditoria.</div>
      </div>
      <div className="auth-form-side">
        <form className="auth-box stack" onSubmit={entrar} style={{ gap: 18 }} noValidate>
          <div><h2 style={{ fontSize: 24, fontWeight: 800 }}>Acesso técnico</h2><p className="muted" style={{ marginTop: 4 }}>Escolha o painel e entre com seu usuário e senha.</p></div>
          <div className="painel-opcoes" role="radiogroup" aria-label="Painel">
            <button type="button" role="radio" aria-checked={painel === 'TI'} className={`painel-opcao ti${painel === 'TI' ? ' ativo' : ''}`} onClick={() => escolher('TI')}><Monitor size={22} color="#2f6fed" />TI<small>Tecnologia da Informação</small></button>
            <button type="button" role="radio" aria-checked={painel === 'MANUTENCAO'} className={`painel-opcao manut${painel === 'MANUTENCAO' ? ' ativo' : ''}`} onClick={() => escolher('MANUTENCAO')}><Wrench size={22} color="#d97706" />Manutenção<small>Elétrica, hidráulica, predial</small></button>
          </div>
          {erro && <div role="alert" className="badge badge-red" style={{ padding: '10px 12px', borderRadius: 10, whiteSpace: 'normal', fontSize: 12.5 }}>{erro}</div>}
          <Field label="Usuário"><div className="search"><User size={16} /><input className="input" name="username" id="usuario" autoFocus={!usuario} style={{ paddingLeft: 38 }} autoComplete="username" autoCapitalize="none" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="seu.usuario" /></div></Field>
          <Field label="Senha">
            <div className="search"><Lock size={16} />
              <input className="input" name="password" id="senha" autoFocus={!!usuario} type={ver ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" style={{ paddingLeft: 38, paddingRight: 40 }} />
              <button type="button" className="btn btn-ghost btn-icon" aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVer((v) => !v)} style={{ position: 'absolute', right: 3, top: 3 }}>{ver ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </Field>
          <label className="row text-sm" style={{ gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> Salvar meu login neste computador</label>
          <Button type="submit" size="lg" block loading={busy}>Entrar</Button>
          {semAdmin && <Link to="/setup" className="badge badge-amber" style={{ padding: '10px 12px', borderRadius: 10, whiteSpace: 'normal', justifyContent: 'center', textDecoration: 'none' }}>Primeira instalação? Criar o administrador</Link>}
          <InstallButton className="link-claro" />
          <a href="/" className="row muted text-sm" style={{ justifyContent: 'center', textDecoration: 'none' }}><ArrowLeft size={14} /> Voltar ao portal de chamados</a>
        </form>
      </div>
    </div>
  );
}
