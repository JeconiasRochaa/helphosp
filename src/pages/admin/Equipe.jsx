import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { AlertTriangle, Copy, Pencil, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { db, getSecondaryAuth, usuarioParaEmail } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Badge, Button, EmptyState, Field, Modal, PageHeader, SearchInput, Spinner, Switch } from '@/components/ui';
import { mascaraTelefone, nomeDepartamento, normalizarDepartamento } from '@/lib/format';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const CARGOS = { TI: ['Técnico de Suporte TI', 'Analista de Sistemas', 'Analista de Redes', 'Coordenador de TI'], MANUTENCAO: ['Supervisor de Manutenção', 'Técnico de Manutenção', 'Eletricista', 'Encanador', 'Técnico de Refrigeração'] };
const TIPOS = { admin: ['Administrador', 'purple'], supervisor: ['Supervisor', 'blue'], tecnico: ['Técnico', 'gray'] };

function senhaProvisoria() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint32Array(10));
  return [...r].map((n) => a[n % a.length]).join('') + '7';
}

export default function Equipe() {
  const { perfil, perms } = useAuth();
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState(null);            // null | {} (novo) | membro
  const [senhaNova, setSenhaNova] = useState(null);  // { usuario, senha }
  const { data, loading } = useCollection(() => perms.isAdmin ? query(collection(db, 'usuarios')) : query(collection(db, 'usuarios'), where('departamento', '==', perms.dep)), [perms.isAdmin, perms.dep]);

  const lista = useMemo(() => data.filter((m) => !busca || [m.nome, m.usuario, m.cargo].some((v) => String(v || '').toLowerCase().includes(busca.toLowerCase())))
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')), [data, busca]);
  const legados = lista.filter((m) => m.id !== m.uid);
  const membros = lista.filter((m) => m.id === m.uid);

  async function remover(m) {
    if (!(await notify.confirm(`${m.nome} perderá o acesso ao sistema imediatamente. A conta de login permanece no Firebase Authentication, mas sem nenhum perfil/permissão.`, { titulo: 'Remover da equipe', confirmar: 'Remover' }))) return;
    try {
      const b = writeBatch(db); b.delete(doc(db, 'usuarios', m.id)); b.delete(doc(db, 'contatos_publicos', m.id)); await b.commit();
      audit('equipe.remover', { usuario: m.usuario, nome: m.nome }); notify.success('Membro removido.');
    } catch (e) { console.error(e); notify.error('Não foi possível remover.'); }
  }
  async function removerLegado(m) {
    if (!(await notify.confirm('Este é um cadastro antigo (login por senha em texto no banco). Ele não funciona mais. Excluir é recomendado por segurança.', { titulo: 'Excluir cadastro legado', confirmar: 'Excluir' }))) return;
    await deleteDoc(doc(db, 'usuarios', m.id)).then(() => { audit('equipe.excluir_legado', { usuario: m.usuario }); notify.success('Cadastro legado excluído.'); }).catch(() => notify.error('Sem permissão.'));
  }

  return (
    <>
      <PageHeader icon={Users} title="Equipe" subtitle={perms.isAdmin ? 'Todos os departamentos' : nomeDepartamento(perms.dep)} actions={<Button icon={UserPlus} onClick={() => setEdit({})}>Novo membro</Button>} />
      <div className="filtros"><SearchInput value={busca} onChange={setBusca} placeholder="Buscar por nome, usuário ou cargo…" /></div>
      {legados.length > 0 && (
        <div className="aviso-device" style={{ background: 'var(--amber-bg)', color: 'var(--amber-fg)', marginBottom: 14 }}><AlertTriangle size={17} style={{ flex: 'none' }} />
          <div><strong>{legados.length} cadastro(s) antigo(s) detectado(s).</strong> Eles vieram da versão anterior (senha salva em texto puro) e não permitem mais login. Recrie esses membros abaixo e exclua os cadastros antigos.</div></div>
      )}
      {loading ? <Spinner /> : membros.length === 0 && legados.length === 0 ? <div className="card"><EmptyState title="Nenhum membro encontrado" /></div> : (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))' }}>
          {membros.map((m) => {
            const [rot, tom] = TIPOS[m.tipo] || TIPOS.tecnico;
            return (
              <div key={m.id} className="card" style={{ textAlign: 'center', opacity: m.status === 'inativo' ? .6 : 1 }}>
                <Avatar nome={m.nome} size="lg" className="" />
                <h4 style={{ marginTop: 10 }}>{m.nome}</h4><div className="muted text-sm">@{m.usuario} · {m.cargo}</div>
                <div className="row-wrap" style={{ justifyContent: 'center', margin: '10px 0' }}>
                  <Badge tone={tom}>{rot}</Badge><Badge tone="gray">{nomeDepartamento(m.departamento)}</Badge>
                  {m.status === 'inativo' && <Badge tone="red">Inativo</Badge>}{m.id === perfil.uid && <Badge tone="green">Você</Badge>}
                  <Badge tone={m.mostrarContato ? 'green' : 'amber'}>{m.mostrarContato ? 'Visível no portal' : 'Oculto no portal'}</Badge>
                </div>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEdit(m)}>Editar</Button>
                  {m.id !== perfil.uid && <Button size="sm" variant="outline" icon={Trash2} onClick={() => remover(m)} title="Remover" />}
                </div>
              </div>
            );
          })}
          {legados.map((m) => (
            <div key={m.id} className="card" style={{ borderStyle: 'dashed', textAlign: 'center' }}>
              <Avatar nome={m.nome} size="lg" /><h4 style={{ marginTop: 10 }}>{m.nome}</h4><div className="muted text-sm">@{m.usuario}</div>
              <div style={{ margin: '10px 0' }}><Badge tone="amber">Cadastro antigo</Badge></div>
              <div className="row" style={{ justifyContent: 'center' }}><Button size="sm" variant="outline" icon={Plus} onClick={() => setEdit({ ...m, id: null, uid: null, recriar: true })}>Recriar</Button><Button size="sm" variant="danger" icon={Trash2} onClick={() => removerLegado(m)} /></div>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs muted" style={{ marginTop: 16 }}><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Para redefinir a senha de alguém, use o console do Firebase (Authentication → usuário → redefinir) ou remova e recrie o membro com outro usuário.</div>
      {edit && <MembroModal membro={edit} onClose={() => setEdit(null)} onCriado={(r) => { setEdit(null); setSenhaNova(r); }} />}
      {senhaNova && (
        <Modal title="Membro criado" icon={ShieldCheck} onClose={() => setSenhaNova(null)} width={440} footer={<Button onClick={() => setSenhaNova(null)}>Concluir</Button>}>
          <p>Entregue estas credenciais ao novo membro. <strong>Esta senha não será exibida novamente</strong> e deve ser trocada no primeiro acesso.</p>
          <div className="card" style={{ marginTop: 12, background: 'var(--card-2)' }}>
            <div className="label">Usuário</div><div className="mono"><strong>{senhaNova.usuario}</strong></div>
            <div className="label" style={{ marginTop: 8 }}>Senha provisória</div>
            <div className="row"><code style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{senhaNova.senha}</code><Button size="sm" variant="outline" icon={Copy} onClick={() => { navigator.clipboard?.writeText(`Usuário: ${senhaNova.usuario}\nSenha: ${senhaNova.senha}`); notify.success('Copiado.', { som: false }); }}>Copiar</Button></div>
          </div>
        </Modal>
      )}
    </>
  );
}

function MembroModal({ membro, onClose, onCriado }) {
  const { perfil, perms } = useAuth();
  const edicao = !!membro.id;
  const [f, setF] = useState({ nome: membro.nome || '', usuario: membro.usuario || '', departamento: normalizarDepartamento(membro.departamento) || perms.dep, cargo: membro.cargo || '', tipo: membro.tipo || 'tecnico', whatsapp: membro.whatsapp || '', mostrarContato: membro.mostrarContato !== false, status: membro.status || 'ativo' });
  const [er, setEr] = useState({}); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const cargos = CARGOS[f.departamento] || [];
  const editandoSi = membro.id === perfil.uid;

  async function salvar(e) {
    e.preventDefault();
    const x = {}; if (!f.nome.trim()) x.nome = 'Obrigatório.';
    if (!edicao && !/^[a-z0-9._-]{3,30}$/.test(f.usuario)) x.usuario = '3–30 caracteres: letras minúsculas, números, ponto ou hífen.';
    if (!f.cargo) x.cargo = 'Selecione.'; if (f.mostrarContato && f.whatsapp.replace(/\D/g, '').length < 10) x.whatsapp = 'Informe um WhatsApp válido para aparecer no portal.';
    setEr(x); if (Object.keys(x).length) return;
    setBusy(true);
    const dados = { nome: f.nome.trim(), cargo: f.cargo, whatsapp: f.whatsapp, mostrarContato: f.mostrarContato, ...(perms.isAdmin ? { departamento: f.departamento, tipo: f.tipo } : { departamento: perms.dep, tipo: f.tipo === 'admin' ? 'tecnico' : f.tipo }), status: f.status };
    const contato = (uid, d) => ({ uid, nome: d.nome, cargo: d.cargo, whatsapp: d.whatsapp.replace(/\D/g, ''), departamento: d.departamento });
    try {
      if (edicao) {
        const b = writeBatch(db); b.update(doc(db, 'usuarios', membro.id), dados);
        if (dados.mostrarContato && dados.status === 'ativo') b.set(doc(db, 'contatos_publicos', membro.id), contato(membro.id, dados)); else b.delete(doc(db, 'contatos_publicos', membro.id));
        await b.commit(); audit('equipe.editar', { usuario: membro.usuario, alteracoes: Object.keys(dados).filter((k) => dados[k] !== membro[k]) }); notify.success('Membro atualizado.'); onClose();
      } else {
        const sec = getSecondaryAuth(); const senha = senhaProvisoria();
        let cred; try { cred = await createUserWithEmailAndPassword(sec, usuarioParaEmail(f.usuario), senha); }
        catch (err) { setEr({ usuario: err.code === 'auth/email-already-in-use' ? 'Este usuário já existe no Firebase Authentication.' : 'Não foi possível criar a conta (' + (err.code || 'erro') + ').' }); setBusy(false); return; }
        const uid = cred.user.uid; await signOut(sec);
        const b = writeBatch(db); b.set(doc(db, 'usuarios', uid), { ...dados, uid, usuario: f.usuario, primeiro_acesso: true, criadoEm: serverTimestamp(), criadoPor: perfil.nome });
        if (dados.mostrarContato) b.set(doc(db, 'contatos_publicos', uid), contato(uid, dados));
        await b.commit(); audit('equipe.criar', { usuario: f.usuario, tipo: dados.tipo, departamento: dados.departamento });
        onCriado({ usuario: f.usuario, senha });
      }
    } catch (err) { console.error(err); notify.error('Não foi possível salvar o membro.'); setBusy(false); }
  }

  return (
    <Modal title={edicao ? 'Editar membro' : membro.recriar ? 'Recriar membro' : 'Novo membro'} icon={UserPlus} onClose={onClose} width={560}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>{edicao ? 'Salvar' : 'Criar acesso'}</Button></>}>
      <form className="stack" onSubmit={salvar} noValidate>
        <Field label="Nome completo" required error={er.nome}><input className="input" value={f.nome} onChange={set('nome')} /></Field>
        <div className="form-row">
          <Field label="Usuário (login)" required error={er.usuario}><input className="input" value={f.usuario} readOnly={edicao} onChange={(e) => setF((s) => ({ ...s, usuario: e.target.value.toLowerCase().trim() }))} /></Field>
          <Field label="Departamento"><select className="select" value={f.departamento} disabled={!perms.isAdmin} onChange={(e) => setF((s) => ({ ...s, departamento: e.target.value, cargo: '' }))}><option value="TI">TI</option><option value="MANUTENCAO">Manutenção</option></select></Field>
        </div>
        <div className="form-row">
          <Field label="Cargo" required error={er.cargo}><select className="select" value={f.cargo} onChange={set('cargo')}><option value="">Selecione…</option>{[...new Set([...cargos, f.cargo].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Perfil de acesso"><select className="select" value={f.tipo} disabled={editandoSi} onChange={set('tipo')}><option value="tecnico">Técnico</option><option value="supervisor">Supervisor</option>{perms.isAdmin && <option value="admin">Administrador</option>}</select></Field>
        </div>
        <Field label="WhatsApp" error={er.whatsapp}><input className="input" inputMode="tel" value={f.whatsapp} onChange={(e) => setF((s) => ({ ...s, whatsapp: mascaraTelefone(e.target.value) }))} /></Field>
        <Switch checked={f.mostrarContato} onChange={(v) => setF((s) => ({ ...s, mostrarContato: v }))} label="Mostrar contato no portal público" />
        {edicao && !editandoSi && <Switch checked={f.status === 'ativo'} onChange={(v) => setF((s) => ({ ...s, status: v ? 'ativo' : 'inativo' }))} label="Acesso ativo" />}
        {!edicao && <div className="aviso-device"><ShieldCheck size={16} style={{ flex: 'none' }} />Uma senha provisória aleatória será gerada. No primeiro acesso, o membro é obrigado a trocá-la.</div>}
      </form>
    </Modal>
  );
}
export { setDoc, updateDoc, orderBy };
