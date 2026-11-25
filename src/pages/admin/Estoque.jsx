import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, Timestamp, updateDoc, where, orderBy, limit } from 'firebase/firestore';
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, Download, Package, Pencil, Plus, Trash2, History } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { Badge, Button, EmptyState, Field, IconButton, Modal, PageHeader, SearchInput, Spinner, StatCard, Tabs } from '@/components/ui';
import { baixarArquivo, fmtData, paraCSV } from '@/lib/format';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const STATUS = ['Em estoque', 'Com defeito', 'Em manutenção'];
const TONE = { 'Em estoque': 'green', 'Com defeito': 'red', 'Em manutenção': 'amber' };
const TIPOS = [['computadores', 'Computador'], ['impressoras', 'Impressora'], ['ramais', 'Ramal'], ['tvs', 'TV'], ['redes', 'Rede'], ['outros', 'Outros']];
const MOTIVOS = ['Novo equipamento', 'Substituição', 'Reposição', 'Expansão', 'Outro'];
const MINIMO = 2;

export default function Estoque() {
  const { perms } = useAuth();
  const { data: itens, loading } = useCollection(() => collection(db, 'estoque'), []);
  const { data: movs } = useCollection(() => query(collection(db, 'movimentacoes'), orderBy('data', 'desc'), limit(200)), []);
  const [aba, setAba] = useState('itens'); const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState(null); const [mover, setMover] = useState(null);
  const lista = useMemo(() => itens.filter((i) => !busca || (i.nome || '').toLowerCase().includes(busca.toLowerCase())).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [itens, busca]);
  const total = itens.reduce((s, i) => s + (parseInt(i.quantidade) || 0), 0);
  const baixos = itens.filter((i) => (i.status || 'Em estoque') === 'Em estoque' && (parseInt(i.quantidade) || 0) <= MINIMO);

  async function excluir(i) {
    if (!(await notify.confirm(`"${i.nome}" e seu saldo serão removidos do estoque.`, { titulo: 'Excluir item', confirmar: 'Excluir', variante: 'danger' }))) return;
    try { await deleteDoc(doc(db, 'estoque', i.fid || i.id)); audit('estoque.excluir', { nome: i.nome }); notify.success('Item excluído.'); } catch (e) { console.error(e); notify.error('Erro ao excluir.'); }
  }
  const csv = () => baixarArquivo('estoque.csv', paraCSV(itens, [{ titulo: 'Item', valor: 'nome' }, { titulo: 'Status', valor: (i) => i.status || 'Em estoque' }, { titulo: 'Quantidade', valor: 'quantidade' }, { titulo: 'Observação', valor: 'observacao' }]), 'text/csv;charset=utf-8');

  return (
    <>
      <PageHeader icon={Package} title="Estoque" subtitle="Equipamentos e suprimentos"
        actions={<><Button variant="outline" size="sm" icon={Download} onClick={csv} disabled={!itens.length}>CSV</Button><Button size="sm" icon={Plus} onClick={() => setEdit({})}>Novo item</Button></>} />
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 16 }}>
        <StatCard icon={Boxes} label="Unidades" value={total} />
        <StatCard icon={CheckCircle2} tone="green" label="Em estoque" value={itens.filter((i) => (i.status || 'Em estoque') === 'Em estoque').length} />
        <StatCard icon={AlertTriangle} tone="red" label="Com defeito" value={itens.filter((i) => i.status === 'Com defeito').length} />
        <StatCard icon={AlertTriangle} tone={baixos.length ? 'amber' : 'gray'} label={`Estoque baixo (≤${MINIMO})`} value={baixos.length} />
      </div>
      <Tabs value={aba} onChange={setAba} tabs={[{ id: 'itens', label: 'Itens', icon: Package }, { id: 'movs', label: 'Movimentações', icon: History }]} />
      {aba === 'itens' ? (<>
        <div className="filtros"><SearchInput value={busca} onChange={setBusca} placeholder="Buscar item…" /></div>
        {loading ? <Spinner /> : lista.length === 0 ? <div className="card"><EmptyState title="Estoque vazio" description='Use "Novo item" para começar.' /></div> : (
          <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
            {lista.map((i) => { const q = parseInt(i.quantidade) || 0; const baixo = (i.status || 'Em estoque') === 'Em estoque' && q <= MINIMO; return (
              <div key={i.id} className="card" style={{ textAlign: 'center', borderColor: baixo ? 'var(--amber-fg)' : undefined }}>
                <div style={{ fontSize: 40 }}>{i.emoji || '📦'}</div>
                <h4 style={{ margin: '6px 0' }}>{i.nome}</h4>
                <Badge tone={TONE[i.status || 'Em estoque']}>{i.status || 'Em estoque'}</Badge>
                <div style={{ fontSize: 26, fontWeight: 700, margin: '6px 0' }}>{q} un.</div>
                {baixo && <div className="text-sm" style={{ color: 'var(--amber-fg)' }}>Estoque baixo</div>}
                {i.observacao && <div className="text-sm muted">{i.observacao}</div>}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                  <Button size="sm" icon={ArrowRight} onClick={() => setMover(i)} disabled={q < 1}>Mover</Button>
                  <IconButton icon={Pencil} label="Editar" onClick={() => setEdit(i)} />
                  {perms.podeExcluir && <IconButton icon={Trash2} label="Excluir" onClick={() => excluir(i)} />}
                </div>
              </div>); })}
          </div>)}
      </>) : (
        movs.length === 0 ? <div className="card"><EmptyState title="Nenhuma movimentação" /></div> :
          <div className="table-card"><table><thead><tr><th>Data</th><th>Item</th><th>Qtd</th><th>Destino</th><th>Motivo</th><th>Técnico</th></tr></thead>
            <tbody>{movs.map((m) => <tr key={m.id}><td>{fmtData(m.data)}</td><td>{m.itemNome}</td><td>{m.quantidade}</td><td>{m.setorDestino}</td><td>{m.motivo}</td><td>{m.tecnico}</td></tr>)}</tbody></table></div>
      )}
      {edit && <ItemModal item={edit} onClose={() => setEdit(null)} />}
      {mover && <MoverModal item={mover} onClose={() => setMover(null)} />}
    </>
  );
}

function ItemModal({ item, onClose }) {
  const novo = !item.id;
  const [f, setF] = useState({ emoji: item.emoji || '📦', nome: item.nome || '', status: item.status || 'Em estoque', quantidade: item.quantidade ?? 1, observacao: item.observacao || '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function salvar(e) {
    e.preventDefault(); if (!f.nome.trim()) return;
    setBusy(true);
    const d = { emoji: f.emoji || '📦', nome: f.nome.trim(), status: f.status, quantidade: Math.max(0, parseInt(f.quantidade) || 0), observacao: f.observacao.trim() };
    try {
      if (novo) await addDoc(collection(db, 'estoque'), { ...d, data_cadastro: Timestamp.now() }); else await updateDoc(doc(db, 'estoque', item.fid || item.id), d);
      audit(novo ? 'estoque.criar' : 'estoque.editar', { nome: d.nome }); notify.success('Item salvo.'); onClose();
    } catch (err) { console.error(err); notify.error('Erro ao salvar.'); setBusy(false); }
  }
  return (
    <Modal title={novo ? 'Novo item' : 'Editar item'} icon={Package} onClose={onClose} width={480} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar</Button></>}>
      <form className="stack" onSubmit={salvar}>
        <div className="form-row"><Field label="Emoji"><input className="input" maxLength={4} value={f.emoji} onChange={set('emoji')} /></Field><Field label="Nome" required><input className="input" value={f.nome} onChange={set('nome')} autoFocus /></Field></div>
        <div className="form-row"><Field label="Status"><select className="select" value={f.status} onChange={set('status')}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Quantidade"><input className="input" type="number" min="0" value={f.quantidade} onChange={set('quantidade')} /></Field></div>
        <Field label="Observação"><textarea className="textarea" rows={2} value={f.observacao} onChange={set('observacao')} /></Field>
      </form>
    </Modal>
  );
}

function MoverModal({ item, onClose }) {
  const { perfil, perms } = useAuth(); const { setores } = useConfig();
  const disp = parseInt(item.quantidade) || 0;
  const [f, setF] = useState({ setor: '', qtd: 1, motivo: '', tipo: 'computadores' }); const [busy, setBusy] = useState(false); const [erro, setErro] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function confirmar(e) {
    e.preventDefault(); const qtd = parseInt(f.qtd) || 0;
    if (!f.setor || !f.motivo) return setErro('Preencha setor e motivo.');
    if (qtd < 1 || qtd > disp) return setErro('Quantidade indisponível.');
    setBusy(true);
    try {
      const rest = disp - qtd; const ref = doc(db, 'estoque', item.fid || item.id);
      if (rest <= 0) await deleteDoc(ref); else await updateDoc(ref, { quantidade: rest });
      const snap = await getDocs(query(collection(db, 'inventario'), where('setor', '==', f.setor)));
      if (snap.empty) await addDoc(collection(db, 'inventario'), { setor: f.setor, computadores: 0, impressoras: 0, ramais: 0, tvs: 0, redes: 0, outros: 0, [f.tipo]: qtd });
      else { const d = snap.docs[0]; await updateDoc(d.ref, { [f.tipo]: (d.data()[f.tipo] || 0) + qtd }); }
      await addDoc(collection(db, 'movimentacoes'), { data: Timestamp.now(), quantidade: qtd, tipo: f.tipo, itemNome: item.nome, setorDestino: f.setor, motivo: f.motivo, tecnico: perfil.nome, departamento: perms.dep });
      audit('estoque.mover', { item: item.nome, qtd, setor: f.setor }); notify.success(`${qtd} un. movida(s) para ${f.setor}.`); onClose();
    } catch (err) { console.error(err); notify.error('Erro ao mover.'); setBusy(false); }
  }
  return (
    <Modal title="Mover para setor" icon={ArrowRight} onClose={onClose} width={500} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={confirmar}>Confirmar</Button></>}>
      <form className="stack" onSubmit={confirmar}>
        <div className="card"><strong>{item.emoji || '📦'} {item.nome}</strong> — disponível: {disp}</div>{erro && <div className="field-error">{erro}</div>}
        <Field label="Setor destino" required><select className="select" value={f.setor} onChange={set('setor')}><option value="">Selecione…</option>{setores.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <div className="form-row"><Field label="Quantidade"><input className="input" type="number" min="1" max={disp} value={f.qtd} onChange={set('qtd')} /></Field>
          <Field label="Motivo" required><select className="select" value={f.motivo} onChange={set('motivo')}><option value="">Selecione…</option>{MOTIVOS.map((m) => <option key={m}>{m}</option>)}</select></Field></div>
        <Field label="Tipo de equipamento"><select className="select" value={f.tipo} onChange={set('tipo')}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </form>
    </Modal>
  );
}
