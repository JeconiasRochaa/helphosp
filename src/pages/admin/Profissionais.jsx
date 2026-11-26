import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { HardHat, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Badge, Button, EmptyState, Field, Modal, PageHeader, SearchInput, Spinner, Switch } from '@/components/ui';
import { useProfissionais } from '@/lib/escala';
import { mascaraTelefone } from '@/lib/format';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const FUNCOES = ['Eletricista', 'Encanador', 'Pintor', 'Pedreiro', 'Marceneiro', 'Serralheiro', 'Técnico de refrigeração', 'Auxiliar de manutenção', 'Supervisor', 'Outro'];

export default function Profissionais() {
  const { perms } = useAuth();
  const { data, loading } = useProfissionais(perms.dep);
  const [busca, setBusca] = useState(''); const [edit, setEdit] = useState(null);
  const lista = useMemo(() => data.filter((p) => !busca || [p.nome, p.funcao].some((v) => String(v || '').toLowerCase().includes(busca.toLowerCase()))), [data, busca]);

  async function excluir(p) {
    if (!(await notify.confirm(`Excluir ${p.nome}? Os registros antigos mantêm o nome, mas ele(a) sai da escala futura e das listas de seleção. Para só deixar de aparecer, prefira desativar.`, { titulo: 'Excluir profissional' }))) return;
    try { await deleteDoc(doc(db, 'profissionais', p.id)); audit('profissional.excluir', { nome: p.nome }); notify.success('Profissional excluído.'); } catch { notify.error('Não foi possível excluir.'); }
  }
  return (
    <>
      <PageHeader icon={HardHat} title="Profissionais" subtitle="Equipe de campo da Manutenção — selecione quem vai executar cada serviço" actions={<Button icon={Plus} onClick={() => setEdit({})}>Novo profissional</Button>} />
      <div className="filtros"><SearchInput value={busca} onChange={setBusca} placeholder="Buscar por nome ou função…" /></div>
      {loading ? <Spinner /> : lista.length === 0 ? <div className="card"><EmptyState icon={HardHat} title="Nenhum profissional cadastrado">Cadastre os profissionais do setor para escolhê-los nos chamados, serviços e na escala.</EmptyState></div> : (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
          {lista.map((p) => (
            <div key={p.id} className="card" style={{ opacity: p.ativo === false ? .55 : 1 }}>
              <div className="row" style={{ gap: 12 }}><Avatar nome={p.nome} size="lg" /><div style={{ minWidth: 0 }}><h4 style={{ margin: 0 }}>{p.nome}</h4><div className="muted text-sm">{p.funcao || 'Profissional'}</div></div></div>
              <div className="row-wrap" style={{ margin: '10px 0' }}>{p.ativo === false ? <Badge tone="red">Inativo</Badge> : <Badge tone="green">Ativo</Badge>}{p.telefone && <Badge tone="gray"><Phone size={11} /> {p.telefone}</Badge>}</div>
              <div className="row"><Button size="sm" variant="outline" icon={Pencil} onClick={() => setEdit(p)}>Editar</Button><Button size="sm" variant="outline" icon={Trash2} onClick={() => excluir(p)} title="Excluir" /></div>
            </div>
          ))}
        </div>
      )}
      {edit && <Form p={edit} dep={perms.dep} onClose={() => setEdit(null)} />}
    </>
  );
}

function Form({ p, dep, onClose }) {
  const [f, setF] = useState({ nome: p.nome || '', funcao: p.funcao || '', telefone: p.telefone || '', ativo: p.ativo !== false });
  const [er, setEr] = useState(''); const [busy, setBusy] = useState(false);
  async function salvar(e) {
    e?.preventDefault();
    if (f.nome.trim().length < 3) return setEr('Informe o nome.');
    setBusy(true);
    try {
      const d = { nome: f.nome.trim(), funcao: f.funcao, telefone: f.telefone, ativo: f.ativo, departamento: dep };
      if (p.id) await updateDoc(doc(db, 'profissionais', p.id), d); else await addDoc(collection(db, 'profissionais'), { ...d, criadoEm: serverTimestamp() });
      audit(p.id ? 'profissional.editar' : 'profissional.criar', { nome: d.nome }); notify.success('Profissional salvo.'); onClose();
    } catch (err) { console.error(err); notify.error('Não foi possível salvar.'); setBusy(false); }
  }
  return (
    <Modal title={p.id ? 'Editar profissional' : 'Novo profissional'} icon={HardHat} onClose={onClose} width={480} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar</Button></>}>
      <form className="stack" onSubmit={salvar} noValidate>
        <Field label="Nome completo" required error={er}><input className="input" autoFocus value={f.nome} onChange={(e) => { setF({ ...f, nome: e.target.value }); setEr(''); }} /></Field>
        <div className="form-row">
          <Field label="Função"><input className="input" list="funcoes-manut" value={f.funcao} onChange={(e) => setF({ ...f, funcao: e.target.value })} placeholder="Ex.: Eletricista" /><datalist id="funcoes-manut">{FUNCOES.map((x) => <option key={x} value={x} />)}</datalist></Field>
          <Field label="Telefone (opcional)"><input className="input" inputMode="tel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })} /></Field>
        </div>
        <Switch checked={f.ativo} onChange={(v) => setF({ ...f, ativo: v })} label="Ativo (aparece nas listas e na escala)" />
      </form>
    </Modal>
  );
}
