import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { Camera, CheckCircle2, ClipboardCheck, Clock, Download, Pencil, Plus, Trash2, Users, Wrench } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, EmptyState, Field, IconButton, Modal, PageHeader, PhotoGallery, PhotoPicker, SearchInput, Spinner, StatCard } from '@/components/ui';
import PeriodoFiltro, { usePeriodo } from '@/components/PeriodoFiltro';
import { enviarImagens } from '@/lib/images';
import { baixarArquivo, fmtData, fmtDia, paraCSV, toDate } from '@/lib/format';
import { CATEGORIAS, NATUREZAS, STATUS_SERVICO, naturezaDe } from '@/lib/servicos';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { Barras, GraficoCard, Rosca } from './dashboard/Graficos';

const TOM_STATUS = { 'Concluído': 'green', 'Em andamento': 'blue', Pendente: 'amber' };
const FOTO_MAX = 5;
const horas = (min) => (min ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : '—');

export default function Servicos() {
  const { perms, perfil } = useAuth(); const p = usePeriodo('30');
  const [busca, setBusca] = useState(''); const [fTec, setFTec] = useState(''); const [fNat, setFNat] = useState(''); const [fCat, setFCat] = useState('');
  const [edit, setEdit] = useState(null); const [ver, setVer] = useState(null);
  const { data, loading } = useCollection(() => query(collection(db, 'servicos'), where('departamento', 'in', perms.depVariantes)), [perms.dep]);

  const noPeriodo = useMemo(() => data.filter((s) => { const d = toDate(s.data); return d >= p.de && d <= p.ate; }), [data, p.de, p.ate]);
  const tecnicos = useMemo(() => [...new Set(noPeriodo.map((s) => s.tecnico).filter(Boolean))].sort(), [noPeriodo]);
  const lista = useMemo(() => noPeriodo.filter((s) => (!fTec || s.tecnico === fTec) && (!fNat || s.natureza === fNat) && (!fCat || s.categoria === fCat)
    && (!busca || [s.titulo, s.descricao, s.local, s.tecnico].some((v) => String(v || '').toLowerCase().includes(busca.toLowerCase()))))
    .sort((a, b) => toDate(b.data) - toDate(a.data)), [noPeriodo, fTec, fNat, fCat, busca]);

  const porNat = NATUREZAS.map((n) => lista.filter((s) => s.natureza === n.id).length);
  const cats = Object.entries(lista.reduce((m, s) => { const k = s.categoria || 'Outros'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const tec = Object.entries(lista.reduce((m, s) => { const k = s.tecnico || '—'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const concl = lista.filter((s) => s.status === 'Concluído').length;
  const totalMin = lista.reduce((a, s) => a + (Number(s.minutos) || 0), 0);
  const pode = (s) => perms.isSupervisor || s.tecnicoUid === perfil.uid;

  async function excluir(s) {
    if (!(await notify.confirm(`Excluir o registro "${s.titulo}"?`, { titulo: 'Excluir serviço', confirmar: 'Excluir', variante: 'danger' }))) return;
    try { await deleteDoc(doc(db, 'servicos', s.id)); audit('servico.excluir', { titulo: s.titulo }); notify.success('Serviço excluído.'); setVer(null); } catch (e) { console.error(e); notify.error('Erro ao excluir.'); }
  }
  const csv = () => baixarArquivo('servicos.csv', paraCSV(lista, [{ titulo: 'Data', valor: (s) => fmtDia(toDate(s.data)) }, { titulo: 'Serviço', valor: 'titulo' }, { titulo: 'Natureza', valor: (s) => naturezaDe(s.natureza).label }, { titulo: 'Categoria', valor: 'categoria' }, { titulo: 'Local', valor: 'local' }, { titulo: 'Técnico', valor: 'tecnico' }, { titulo: 'Status', valor: 'status' }, { titulo: 'Tempo (min)', valor: 'minutos' }, { titulo: 'Descrição', valor: 'descricao' }]), 'text/csv;charset=utf-8');

  return (
    <>
      <PageHeader icon={ClipboardCheck} title="Serviços da equipe" subtitle="Atividades realizadas fora dos chamados: ajustes, melhorias, preventivas e mais"
        actions={<><Button variant="outline" size="sm" icon={Download} onClick={csv} disabled={!lista.length}>CSV</Button><Button size="sm" icon={Plus} onClick={() => setEdit({})}>Registrar serviço</Button></>} />
      <div className="filtros" style={{ alignItems: 'flex-end' }}>
        <PeriodoFiltro p={p} />
        <Field label="Técnico"><select className="select" value={fTec} onChange={(e) => setFTec(e.target.value)}><option value="">Todos</option>{tecnicos.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Natureza"><select className="select" value={fNat} onChange={(e) => setFNat(e.target.value)}><option value="">Todas</option>{NATUREZAS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></Field>
        <Field label="Categoria"><select className="select" value={fCat} onChange={(e) => setFCat(e.target.value)}><option value="">Todas</option>{(CATEGORIAS[perms.dep] || []).map((c) => <option key={c}>{c}</option>)}</select></Field>
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar serviço…" />
      </div>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', margin: '12px 0 16px' }}>
        <StatCard icon={ClipboardCheck} label="Serviços registrados" value={lista.length} />
        <StatCard icon={CheckCircle2} tone="green" label="Concluídos" value={concl} hint={lista.length ? `${Math.round((concl / lista.length) * 100)}%` : ''} />
        <StatCard icon={Clock} tone="amber" label="Tempo total" value={horas(totalMin)} />
        <StatCard icon={Users} tone="purple" label="Técnicos" value={new Set(lista.map((s) => s.tecnico)).size} />
      </div>
      {loading ? <Spinner /> : lista.length === 0 ? <div className="card"><EmptyState icon={Wrench} title="Nenhum serviço no período" description='Use "Registrar serviço" para documentar o que a equipe fez ou identificou.' /></div> : (<>
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', marginBottom: 16 }}>
          <GraficoCard title="Por natureza" small><Rosca labels={NATUREZAS.map((n) => n.label)} data={porNat} cores={NATUREZAS.map((n) => n.cor)} /></GraficoCard>
          <GraficoCard title="Por categoria" small><Barras horizontal labels={cats.map((c) => c[0])} data={cats.map((c) => c[1])} cores="#2f6fed" rotulo="Serviços" /></GraficoCard>
          <GraficoCard title="Por técnico" small><Barras horizontal labels={tec.map((c) => c[0])} data={tec.map((c) => c[1])} cores="#7c5cfc" rotulo="Serviços" /></GraficoCard>
        </div>
        <div className="stack">
          {lista.map((s) => { const n = naturezaDe(s.natureza); return (
            <div key={s.id} className="chamado-card" style={{ cursor: 'pointer', borderLeft: `4px solid ${n.cor}`, flexWrap: 'nowrap' }} onClick={() => setVer(s)}>
              {s.fotos?.[0] ? <img src={s.fotos[0]} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flex: 'none' }} /> : <div className="avatar" style={{ width: 64, height: 64, borderRadius: 10 }}><Wrench size={22} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{s.titulo}</strong>
                <small className="muted">{fmtDia(toDate(s.data))} · {s.categoria || '—'}{s.local ? ` · ${s.local}` : ''} · {s.tecnico || '—'}{s.fotos?.length ? ` · 📷 ${s.fotos.length}` : ''}</small>
              </div>
              <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}><Badge tone="gray" style={{ background: n.cor + '22', color: n.cor }}>{n.label}</Badge><Badge tone={TOM_STATUS[s.status] || 'gray'}>{s.status}</Badge></div>
            </div>); })}
        </div>
      </>)}
      {edit && <ServicoModal item={edit} onClose={() => setEdit(null)} />}
      {ver && (
        <Modal title={ver.titulo} icon={ClipboardCheck} onClose={() => setVer(null)} width={640}
          footer={pode(ver) ? <><Button variant="danger" icon={Trash2} onClick={() => excluir(ver)}>Excluir</Button><Button icon={Pencil} onClick={() => { setEdit(ver); setVer(null); }}>Editar</Button></> : null}>
          <div className="stack">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Badge tone="gray" style={{ background: naturezaDe(ver.natureza).cor + '22', color: naturezaDe(ver.natureza).cor }}>{naturezaDe(ver.natureza).label}</Badge><Badge tone={TOM_STATUS[ver.status] || 'gray'}>{ver.status}</Badge>{ver.categoria && <Badge tone="blue">{ver.categoria}</Badge>}</div>
            <div className="text-sm muted">{fmtData(ver.data)} · {ver.tecnico}{ver.local ? ` · ${ver.local}` : ''} · tempo gasto: {horas(ver.minutos)}</div>
            {ver.descricao && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{ver.descricao}</p>}
            {ver.fotos?.length > 0 && <PhotoGallery urls={ver.fotos} titulo="Fotos do serviço" />}
          </div>
        </Modal>)}
    </>
  );
}

function ServicoModal({ item, onClose }) {
  const { perfil, perms } = useAuth(); const novo = !item.id;
  const hoje = new Date(); const z = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000);
  const dataIni = item.data ? new Date(toDate(item.data).getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : z.toISOString().slice(0, 16);
  const [f, setF] = useState({ titulo: item.titulo || '', natureza: item.natureza || 'ajuste', categoria: item.categoria || '', local: item.local || '', descricao: item.descricao || '', status: item.status || 'Concluído', horas: item.minutos ? Math.floor(item.minutos / 60) : '', min: item.minutos ? item.minutos % 60 : '', data: dataIni });
  const [fotos, setFotos] = useState([]); const [pct, setPct] = useState(0); const [busy, setBusy] = useState(false); const [erro, setErro] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const jaTem = item.fotos?.length || 0;
  async function salvar(e) {
    e.preventDefault(); if (!f.titulo.trim()) return setErro('Descreva o serviço em poucas palavras.'); if (!f.categoria) return setErro('Selecione a categoria.');
    setBusy(true); setErro('');
    try {
      let novas = []; if (fotos.length) novas = await enviarImagens(fotos, 'servicos', setPct);
      const d = { titulo: f.titulo.trim(), natureza: f.natureza, categoria: f.categoria, local: f.local.trim(), descricao: f.descricao.trim(), status: f.status, minutos: (parseInt(f.horas) || 0) * 60 + (parseInt(f.min) || 0), data: Timestamp.fromDate(new Date(f.data)), fotos: [...(item.fotos || []), ...novas] };
      if (novo) await addDoc(collection(db, 'servicos'), { ...d, departamento: perms.dep, tecnico: perfil.nome, tecnicoUid: perfil.uid, criadoEm: Timestamp.now() });
      else await updateDoc(doc(db, 'servicos', item.id), d);
      audit(novo ? 'servico.criar' : 'servico.editar', { titulo: d.titulo, natureza: d.natureza }); notify.success('Serviço registrado.'); onClose();
    } catch (err) { console.error(err); setErro('Não foi possível salvar. Tente novamente.'); setBusy(false); }
  }
  return (
    <Modal title={novo ? 'Registrar serviço' : 'Editar serviço'} icon={ClipboardCheck} onClose={onClose} width={620}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button loading={busy} onClick={salvar}>{busy && fotos.length ? `Enviando ${pct}%` : 'Salvar'}</Button></>}>
      <form className="stack" onSubmit={salvar}>
        {erro && <div className="field-error">{erro}</div>}
        <Field label="O que foi feito / identificado" required><input className="input" value={f.titulo} onChange={set('titulo')} placeholder="Ex.: Troca de cabo de rede do consultório 3" autoFocus /></Field>
        <div className="form-row">
          <Field label="Natureza" required><select className="select" value={f.natureza} onChange={set('natureza')}>{NATUREZAS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></Field>
          <Field label="Categoria" required><select className="select" value={f.categoria} onChange={set('categoria')}><option value="">Selecione…</option>{(CATEGORIAS[perms.dep] || []).map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <div className="form-row">
          <Field label="Setor / local"><input className="input" value={f.local} onChange={set('local')} placeholder="Ex.: UTI I" /></Field>
          <Field label="Situação"><select className="select" value={f.status} onChange={set('status')}>{STATUS_SERVICO.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <div className="form-row">
          <Field label="Data e hora"><input className="input" type="datetime-local" value={f.data} onChange={set('data')} /></Field>
          <Field label="Tempo gasto"><div style={{ display: 'flex', gap: 8 }}><input className="input" type="number" min="0" placeholder="h" value={f.horas} onChange={set('horas')} /><input className="input" type="number" min="0" max="59" placeholder="min" value={f.min} onChange={set('min')} /></div></Field>
        </div>
        <Field label="Detalhes"><textarea className="textarea" rows={3} value={f.descricao} onChange={set('descricao')} placeholder="O que foi observado, o que foi feito, o que ainda precisa melhorar…" /></Field>
        <Field label={`Fotos (até ${FOTO_MAX - jaTem})`}><PhotoPicker value={fotos} onChange={setFotos} max={Math.max(FOTO_MAX - jaTem, 0) || 1} /></Field>
        {jaTem > 0 && <PhotoGallery urls={item.fotos} titulo="Fotos já anexadas" />}
      </form>
    </Modal>
  );
}
export { Camera };
