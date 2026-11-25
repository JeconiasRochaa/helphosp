import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Field } from '@/components/ui';
import { erroSenha, forcaSenha } from '@/lib/validators';
import { notify } from '@/lib/notify';

export function MedidorSenha({ valor }) {
  const f = valor ? Math.max(1, forcaSenha(valor)) : 0;
  return <div className="pw-meter" aria-hidden>{[1, 2, 3, 4].map((i) => <i key={i} className={i <= f ? 'on' + f : ''} />)}</div>;
}

export default function TrocarSenha() {
  const { perfil, trocarSenha, logout } = useAuth();
  const nav = useNavigate();
  const [atual, setAtual] = useState(''); const [nova, setNova] = useState(''); const [conf, setConf] = useState('');
  const [erro, setErro] = useState(''); const [busy, setBusy] = useState(false);

  async function salvar(e) {
    e.preventDefault(); setErro('');
    const msg = erroSenha(nova);
    if (msg) return setErro(msg);
    if (nova !== conf) return setErro('A confirmação não confere com a nova senha.');
    if (nova === atual) return setErro('A nova senha deve ser diferente da atual.');
    setBusy(true);
    try { await trocarSenha(atual, nova); notify.success('Senha alterada com sucesso.'); nav('/admin', { replace: true }); }
    catch (err) { setErro(['auth/wrong-password', 'auth/invalid-credential'].includes(err.code) ? 'A senha atual está incorreta.' : 'Não foi possível alterar a senha.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <div className="auth-form-side" style={{ background: 'var(--bg)' }}>
        <form className="auth-box card stack" onSubmit={salvar} style={{ padding: 26, gap: 14 }}>
          <div className="row"><div className="avatar"><KeyRound size={18} /></div><div><h2 style={{ fontSize: 19 }}>{perfil?.primeiro_acesso ? 'Defina sua nova senha' : 'Alterar senha'}</h2><p className="muted text-sm">{perfil?.primeiro_acesso ? 'Por segurança, troque a senha provisória antes de continuar.' : 'Use uma senha forte e exclusiva.'}</p></div></div>
          {erro && <div role="alert" className="badge badge-red" style={{ padding: '9px 12px', borderRadius: 10, whiteSpace: 'normal' }}>{erro}</div>}
          <Field label="Senha atual"><input className="input" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} /></Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres, com letras e números."><input className="input" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} /><MedidorSenha valor={nova} /></Field>
          <Field label="Confirmar nova senha"><input className="input" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} /></Field>
          <Button type="submit" loading={busy} block>Salvar nova senha</Button>
          <Button variant="ghost" onClick={() => logout()} block>Sair</Button>
        </form>
      </div>
    </div>
  );
}
