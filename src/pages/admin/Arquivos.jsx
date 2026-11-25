import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { deleteObject, ref as sref } from 'firebase/storage';
import { Images, Trash2, UploadCloud } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, EmptyState, Field, IconButton, Modal, PageHeader, PhotoPicker, Spinner } from '@/components/ui';
import { enviarImagens } from '@/lib/images';
import { fmtData, toDate } from '@/lib/format';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const CATS = { defeito: ['Defeito', 'red'], instalacao: ['Instalação', 'green'], servico: ['Serviço', 'blue'], antes: ['Antes', 'amber'], depois: ['Depois', 'teal'], geral: ['Geral', 'purple'] };

export default function Arquivos() {
  const { perms } = useAuth(); const [cat, setCat] = useState(''); const [novo, setNovo] = useState(false);
  const { data, loading } = useCollection(() => query(collection(db, 'arquivos'), where('departamento', 'in', perms.depVariantes)), [perms.dep]);
  const fotos = useMemo(() => data.filter((x) => !cat || x.categoria === cat).sort((a, b) => toDate(b.data) - toDate(a.data)).slice(0, 200), [data, cat]);

  async function excluir(x) {
    if (!(await notify.confirm('A foto será removida do banco de fotos.', { titulo: 'Excluir foto', confirmar: 'Excluir', variante: 'danger' }))) return;
    try {
      await deleteDoc(doc(db, 'arquivos', x.id));
      if (/^https?:/.test(x.url)) { try { await deleteObject(sref(storage, x.url)); } catch { /* arquivo já removido */ } }
      audit('arquivo.excluir', { id: x.id }); notify.success('Foto excluída.');
    } catch (e) { console.error(e); notify.error('Erro ao excluir.'); }
  }

  return (
    <>
      <PageHeader icon={Images} title="Banco de fotos" subtitle="Registro fotográfico de atendimentos e instalações" actions={<Button size="sm" icon={UploadCloud} onClick={() => setNovo(true)}>Nova foto</Button>} />
      <div className="filtros"><select className="select" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
      {loading ? <Spinner /> : fotos.length === 0 ? <div className="card"><EmptyState title="Nenhuma foto registrada" description="Envie a primeira foto." /></div> : (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
          {fotos.map((x) => { const [rot, tom] = CATS[x.categoria] || CATS.geral; return (
            <div key={x.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img src={x.url} alt={x.descricao || rot} loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover', cursor: 'zoom-in', display: 'block' }}
                onClick={() => notify.lightbox(fotos.map((f) => f.url), fotos.indexOf(x))} />
              <div style={{ padding: 10 }}>
                <Badge tone={tom}>{rot}</Badge>
                {x.descricao && <p className="text-sm" style={{ margin: '6px 0 0' }}>{x.descricao}</p>}
                <div className="text-sm muted" style={{ marginTop: 6 }}>{fmtData(x.data)} · {x.autor || '—'}</div>
                <div style={{ marginTop: 6 }}><IconButton icon={Trash2} label="Excluir" onClick={() => excluir(x)} /></div>
              </div>
            </div>); })}
        </div>)}
      {novo && <UploadModal onClose={() => setNovo(false)} />}
    </>
  );
}

function UploadModal({ onClose }) {
  const { perfil, perms } = useAuth();
  const [f, setF] = useState({ cat: 'geral', desc: '' }); const [fotos, setFotos] = useState([]); const [pct, setPct] = useState(0); const [busy, setBusy] = useState(false);
  async function enviar() {
    if (!fotos.length) return notify.warning('Selecione uma foto.');
    setBusy(true);
    try {
      const urls = await enviarImagens(fotos, 'fotos-gerais', setPct);
      if (!urls.length) throw new Error('upload');
      for (const url of urls) await addDoc(collection(db, 'arquivos'), { url, categoria: f.cat, descricao: f.desc.trim(), autor: perfil.nome, departamento: perms.dep, data: Timestamp.now() });
      audit('arquivo.enviar', { categoria: f.cat, fotos: urls.length }); notify.success('Foto enviada.'); onClose();
    } catch (e) { console.error(e); notify.error('Erro ao enviar a foto.'); setBusy(false); }
  }
  return (
    <Modal title="Enviar fotos" icon={UploadCloud} onClose={onClose} width={480} footer={<><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button loading={busy} onClick={enviar}>{busy ? `Enviando ${pct}%` : 'Enviar'}</Button></>}>
      <div className="stack">
        <Field label="Categoria"><select className="select" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></Field>
        <Field label="Descrição"><textarea className="textarea" rows={2} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="O que a foto documenta…" /></Field>
        <PhotoPicker value={fotos} onChange={setFotos} max={6} />
        {busy && <div className="progress"><div style={{ width: pct + '%', height: 6, background: 'var(--blue)', borderRadius: 4 }} /></div>}
      </div>
    </Modal>
  );
}
