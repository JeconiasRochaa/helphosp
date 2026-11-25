import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, List, MapPin, Pencil, Plus, Trash2, User } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { Button, EmptyState, Field, IconButton, Modal, PageHeader, Spinner, Tabs } from '@/components/ui';
import { toDate } from '@/lib/format';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const chaveDia = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const longo = (d) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const hora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const paraInput = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };

export default function Agenda() {
  const { perms } = useAuth(); const [aba, setAba] = useState('lista'); const [edit, setEdit] = useState(null); const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const { data, loading } = useCollection(() => query(collection(db, 'agenda'), where('departamento', 'in', perms.depVariantes)), [perms.dep]);
  const hoje = new Date();
  const grupos = useMemo(() => { const m = new Map(); data.slice().sort((a, b) => toDate(a.data) - toDate(b.data)).forEach((a) => { const d = toDate(a.data); const k = chaveDia(d); if (!m.has(k)) m.set(k, { d, itens: [] }); m.get(k).itens.push(a); }); return [...m.values()]; }, [data]);
  const porDia = useMemo(() => Object.fromEntries(grupos.map((g) => [chaveDia(g.d), g.itens])), [grupos]);
  const proximos = grupos.filter((g) => g.d >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));

  async function excluir(a) {
    if (!(await notify.confirm('Remover este compromisso da agenda?', { titulo: 'Excluir compromisso', confirmar: 'Excluir', variante: 'danger' }))) return;
    try { await deleteDoc(doc(db, 'agenda', a.fid || a.id)); audit('agenda.excluir', { titulo: a.titulo }); notify.success('Compromisso removido.'); } catch (e) { console.error(e); notify.error('Erro ao excluir.'); }
  }
  const Item = ({ a }) => { const d = toDate(a.data); return (
    <div className="card" style={{ borderLeft: '4px solid var(--purple)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <div><strong>{a.titulo}</strong>
        <div className="text-sm muted" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}><span><Clock size={12} /> {hora(d)}</span>{a.local && <span><MapPin size={12} /> {a.local}</span>}{a.responsavel && <span><User size={12} /> {a.responsavel}</span>}</div>
        {a.descricao && <p className="text-sm" style={{ margin: '6px 0 0' }}>{a.descricao}</p>}</div>
      <div style={{ display: 'flex', gap: 4 }}><IconButton icon={Pencil} label="Editar" onClick={() => setEdit(a)} /><IconButton icon={Trash2} label="Excluir" onClick={() => excluir(a)} /></div>
    </div>); };

  const primeiro = mes.getDay(); const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas = [...Array(primeiro).fill(null), ...Array.from({ length: diasMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))];
  const [sel, setSel] = useState(null);

  return (
    <>
      <PageHeader icon={CalendarDays} title="Agenda" subtitle="Compromissos e agendamentos" actions={<Button size="sm" icon={Plus} onClick={() => setEdit({})}>Novo compromisso</Button>} />
      <Tabs value={aba} onChange={setAba} tabs={[{ id: 'lista', label: 'Lista', icon: List }, { id: 'cal', label: 'Calendário', icon: CalendarDays }]} />
      {loading ? <Spinner /> : aba === 'lista' ? (
        proximos.length === 0 ? <div className="card"><EmptyState title="Nenhum compromisso futuro" /></div> :
          proximos.map((g) => { const eh = chaveDia(g.d) === chaveDia(hoje); return (
            <div key={chaveDia(g.d)} style={{ marginBottom: 16 }}><h3 style={{ fontSize: 14, color: eh ? 'var(--danger)' : undefined, textTransform: 'capitalize' }}>{eh && '● HOJE — '}{longo(g.d)}</h3>{g.itens.map((a) => <Item key={a.id} a={a} />)}</div>); })
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <IconButton icon={ChevronLeft} label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} />
            <strong style={{ textTransform: 'capitalize' }}>{mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
            <IconButton icon={ChevronRight} label="Próximo mês" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x, i) => <div key={i} className="text-sm muted" style={{ textAlign: 'center' }}>{x}</div>)}
            {celulas.map((d, i) => { if (!d) return <div key={i} />; const its = porDia[chaveDia(d)] || []; const eh = chaveDia(d) === chaveDia(hoje); const ativo = sel && chaveDia(sel) === chaveDia(d); return (
              <button key={i} onClick={() => setSel(d)} style={{ minHeight: 48, border: '1px solid var(--border)', borderRadius: 8, background: ativo ? 'var(--blue)' : 'var(--card)', color: ativo ? '#fff' : 'inherit', outline: eh ? '2px solid var(--danger)' : 'none', cursor: 'pointer' }}>
                {d.getDate()}{its.length > 0 && <div style={{ fontSize: 10 }}>● {its.length}</div>}</button>); })}
          </div>
          {sel && <div style={{ marginTop: 14 }}><h4 style={{ textTransform: 'capitalize' }}>{longo(sel)}</h4>{(porDia[chaveDia(sel)] || []).map((a) => <Item key={a.id} a={a} />)}{!(porDia[chaveDia(sel)] || []).length && <div className="muted text-sm">Sem compromissos.</div>}</div>}
        </div>)}
      {edit && <AgendaModal item={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function AgendaModal({ item, onClose }) {
  const { perfil, perms } = useAuth(); const novo = !item.id;
  const [f, setF] = useState({ titulo: item.titulo || '', data: item.data ? paraInput(toDate(item.data)) : '', local: item.local || '', responsavel: item.responsavel || perfil.nome, descricao: item.descricao || '' }); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function salvar(e) {
    e.preventDefault(); if (!f.titulo.trim() || !f.data) return notify.warning('Informe título e data.');
    setBusy(true);
    const d = { titulo: f.titulo.trim(), data: Timestamp.fromDate(new Date(f.data)), local: f.local.trim(), responsavel: f.responsavel.trim(), descricao: f.descricao.trim() };
    try { if (novo) await addDoc(collection(db, 'agenda'), { ...d, departamento: perms.dep, criadoPor: perfil.nome }); else await updateDoc(doc(db, 'agenda', item.fid || item.id), d);
      audit(novo ? 'agenda.criar' : 'agenda.editar', { titulo: d.titulo }); notify.success('Compromisso salvo.'); onClose(); } catch (err) { console.error(err); notify.error('Erro ao salvar.'); setBusy(false); }
  }
  return (
    <Modal title={novo ? 'Novo compromisso' : 'Editar compromisso'} icon={CalendarDays} onClose={onClose} width={480} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar</Button></>}>
      <form className="stack" onSubmit={salvar}>
        <Field label="Título" required><input className="input" value={f.titulo} onChange={set('titulo')} autoFocus /></Field>
        <div className="form-row"><Field label="Data e hora" required><input className="input" type="datetime-local" value={f.data} onChange={set('data')} /></Field><Field label="Local"><input className="input" value={f.local} onChange={set('local')} /></Field></div>
        <Field label="Responsável"><input className="input" value={f.responsavel} onChange={set('responsavel')} /></Field>
        <Field label="Descrição"><textarea className="textarea" rows={2} value={f.descricao} onChange={set('descricao')} /></Field>
      </form>
    </Modal>
  );
}
