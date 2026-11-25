import { useMemo, useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Download, FileText, History, Printer, RefreshCw } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useChamados } from '@/context/ChamadosContext';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { Badge, Button, EmptyState, Field, Modal, PageHeader, SearchInput, Spinner, StatCard } from '@/components/ui';
import { baixarArquivo, fmtDia, paraCSV, toDate } from '@/lib/format';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const SETORES_TONERS = ['Administração', 'Faturamento', 'UTI I', 'UTI II', 'NIR', 'Oncologia I & II', 'Recepção Geral', 'Recepção CR', 'Farmácia CAF', 'Centro Cirúrgico'];
const dataTroca = (t) => toDate(t.data_troca_toner || t.data_abertura);
const diasDesde = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);
const estado = (dias) => (dias === null || dias > 90 ? ['Crítico', 'red'] : dias > 60 ? ['Atenção', 'amber'] : ['Em dia', 'green']);

export default function Toners() {
  const { chamados, loading } = useChamados();
  const { setores, logos } = useConfig();
  const [busca, setBusca] = useState(''); const [troca, setTroca] = useState(null); const [hist, setHist] = useState(null);
  const trocas = useMemo(() => chamados.filter((c) => c.tipo === 'toner').sort((a, b) => dataTroca(b) - dataTroca(a)), [chamados]);
  const listaSetores = useMemo(() => [...new Set([...SETORES_TONERS, ...trocas.map((t) => t.setor).filter(Boolean)])], [trocas]);
  const linhas = useMemo(() => listaSetores.map((s) => { const ult = trocas.find((t) => t.setor === s); const d = ult ? dataTroca(ult) : null; const dias = d ? diasDesde(d) : null; return { setor: s, ult, d, dias, n: trocas.filter((t) => t.setor === s).length, est: estado(dias) }; })
    .filter((l) => !busca || l.setor.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999)), [listaSetores, trocas, busca]);
  const criticos = linhas.filter((l) => l.est[0] === 'Crítico').length;
  const prev = trocas.filter((t) => t.tipo_troca === 'preventiva').length;

  const csv = () => baixarArquivo('trocas-toner.csv', paraCSV(trocas, [{ titulo: 'Data', valor: (t) => fmtDia(dataTroca(t)) }, { titulo: 'Setor', valor: 'setor' }, { titulo: 'Tipo', valor: 'tipo_troca' }, { titulo: 'Modelo', valor: 'modelo_toner' }, { titulo: 'Lote', valor: 'lote' }, { titulo: 'Técnico', valor: 'tecnico' }, { titulo: 'Observação', valor: 'observacao' }]), 'text/csv;charset=utf-8');
  async function pdf() {
    try {
      const { jsPDF } = await import('jspdf'); const p = new jsPDF('p', 'mm', 'a4'); let y = 18;
      if (logos.hospital) { try { p.addImage(logos.hospital, 'PNG', 10, 6, 0, 12); } catch { /* */ } }
      p.setFontSize(15); p.text('HelpHosp — Monitor de Toners', 105, y, { align: 'center' }); y += 6; p.setFontSize(9); p.text(`${new Date().toLocaleDateString('pt-BR')} · ${trocas.length} troca(s) · ${criticos} setor(es) crítico(s)`, 105, y, { align: 'center' }); y += 9;
      p.setFillColor(11, 35, 64); p.rect(10, y - 4, 190, 6, 'F'); p.setTextColor(255); ['Setor', 'Última troca', 'Dias', 'Situação', 'Trocas'].forEach((h, i) => p.text(h, [12, 80, 115, 135, 170][i], y)); p.setTextColor(0); y += 6;
      linhas.forEach((l) => { if (y > 280) { p.addPage(); y = 15; } [l.setor, l.d ? fmtDia(l.d) : 'Nunca', l.dias ?? '—', l.est[0], l.n].forEach((v, i) => p.text(String(v), [12, 80, 115, 135, 170][i], y)); y += 6; });
      p.save('monitor-toners.pdf'); audit('toner.relatorio');
    } catch (e) { console.error(e); notify.error('Erro ao gerar o PDF.'); }
  }

  return (
    <>
      <PageHeader icon={Printer} title="Monitor de Toners" subtitle="Última troca por setor e histórico"
        actions={<><Button variant="outline" size="sm" icon={Download} onClick={csv} disabled={!trocas.length}>CSV</Button><Button variant="outline" size="sm" icon={FileText} onClick={pdf} disabled={!trocas.length}>PDF</Button><Button size="sm" icon={RefreshCw} onClick={() => setTroca({})}>Registrar troca</Button></>} />
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 16 }}>
        <StatCard icon={Printer} label="Total de trocas" value={trocas.length} />
        <StatCard icon={CheckCircle2} tone="green" label="Preventivas" value={prev} />
        <StatCard icon={AlertTriangle} tone="amber" label="Necessárias" value={trocas.filter((t) => t.tipo_troca === 'necessaria').length} />
        <StatCard icon={AlertTriangle} tone={criticos ? 'red' : 'gray'} label="Setores críticos (>90 d)" value={criticos} />
      </div>
      <div className="filtros"><SearchInput value={busca} onChange={setBusca} placeholder="Buscar setor…" /></div>
      {loading ? <Spinner /> : linhas.length === 0 ? <div className="card"><EmptyState title="Nenhum setor" /></div> : (
        <div className="table-card"><table><thead><tr><th>Setor</th><th>Última troca</th><th>Dias</th><th>Situação</th><th>Tipo</th><th>Trocas</th><th /></tr></thead>
          <tbody>{linhas.map((l) => (
            <tr key={l.setor} style={l.est[1] === 'red' ? { background: 'var(--red-bg)' } : undefined}>
              <td><strong>{l.setor}</strong></td><td>{l.d ? fmtDia(l.d) : <span style={{ color: 'var(--red-fg)' }}>Nunca trocado</span>}</td><td>{l.dias ?? '—'}</td>
              <td><Badge tone={l.est[1]}>{l.est[0]}</Badge></td><td>{l.ult ? <Badge tone={l.ult.tipo_troca === 'preventiva' ? 'green' : 'amber'}>{l.ult.tipo_troca === 'preventiva' ? 'Preventiva' : 'Necessária'}</Badge> : '—'}</td><td>{l.n}</td>
              <td className="nowrap"><Button size="sm" icon={RefreshCw} onClick={() => setTroca({ setor: l.setor })}>Trocar</Button> <Button size="sm" variant="outline" icon={History} onClick={() => setHist(l.setor)}>Histórico</Button></td>
            </tr>))}</tbody></table></div>
      )}
      {troca && <TrocaModal inicial={troca} setores={[...new Set([...listaSetores, ...setores])]} onClose={() => setTroca(null)} />}
      {hist && <Modal title={`Histórico — ${hist}`} icon={History} onClose={() => setHist(null)} width={620}>
        {trocas.filter((t) => t.setor === hist).length === 0 ? <EmptyState title="Sem trocas registradas" /> : <div className="timeline">{trocas.filter((t) => t.setor === hist).map((t) => (
          <div key={t.id} className="tl-item"><time>{fmtDia(dataTroca(t))} · {t.tecnico}</time><div><Badge tone={t.tipo_troca === 'preventiva' ? 'green' : 'amber'}>{t.tipo_troca === 'preventiva' ? 'Preventiva' : 'Necessária'}</Badge> {t.modelo_toner}{t.lote && ` · lote ${t.lote}`}</div>{t.observacao && <div className="text-sm muted">{t.observacao}</div>}</div>))}</div>}
      </Modal>}
    </>
  );
}

function TrocaModal({ inicial, setores, onClose }) {
  const { perfil, perms } = useAuth();
  const [f, setF] = useState({ setor: inicial.setor || '', tipo: 'preventiva', tecnico: perfil.nome, modelo: '', lote: '', obs: '' });
  const [busy, setBusy] = useState(false); const [erro, setErro] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function salvar(e) {
    e.preventDefault(); if (!f.setor) return setErro('Selecione o setor.');
    setBusy(true);
    try {
      const agora = Timestamp.now();
      await addDoc(collection(db, 'chamados'), { protocolo: 'TN-' + Date.now().toString(36).toUpperCase(), setor: f.setor, tipo: 'toner', isToner: true, status: 'Concluído', solicitante: f.tecnico, tecnico: f.tecnico.trim() || perfil.nome, departamento: perms.dep, titulo: `Troca de toner — ${f.setor}`, tipo_troca: f.tipo, modelo_toner: f.modelo.trim(), lote: f.lote.trim(), observacao: f.obs.trim(), deviceUid: auth.currentUser.uid, data_abertura: agora, data_troca_toner: agora });
      audit('toner.troca', { setor: f.setor, tipo: f.tipo }); notify.success('Troca de toner registrada.'); onClose();
    } catch (err) { console.error(err); notify.error('Erro ao registrar a troca.'); setBusy(false); }
  }
  return (
    <Modal title="Registrar troca de toner" icon={RefreshCw} onClose={onClose} width={520} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Registrar</Button></>}>
      <form className="stack" onSubmit={salvar}>{erro && <div className="field-error">{erro}</div>}
        <Field label="Setor" required><select className="select" value={f.setor} onChange={set('setor')}><option value="">Selecione…</option>{setores.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <div className="form-row"><Field label="Tipo de troca"><select className="select" value={f.tipo} onChange={set('tipo')}><option value="preventiva">Preventiva</option><option value="necessaria">Necessária (acabou)</option></select></Field><Field label="Técnico"><input className="input" value={f.tecnico} onChange={set('tecnico')} /></Field></div>
        <div className="form-row"><Field label="Modelo do toner"><input className="input" value={f.modelo} onChange={set('modelo')} placeholder="Ex.: HP 85A" /></Field><Field label="Lote"><input className="input" value={f.lote} onChange={set('lote')} /></Field></div>
        <Field label="Observações"><textarea className="textarea" rows={2} value={f.obs} onChange={set('obs')} /></Field>
      </form>
    </Modal>
  );
}
