import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { CheckCircle2, ClipboardCheck, Clock, Download, FileText, Ticket, Trophy } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { Button, Card, EmptyState, Field, StatCard } from '@/components/ui';
import { baixarArquivo, fmtDuracao, paraCSV, toDate } from '@/lib/format';
import { NATUREZAS, naturezaDe } from '@/lib/servicos';
import { notify } from '@/lib/notify';
import { BarrasSeries, GraficoCard, Barras, Rosca } from '../dashboard/Graficos';

const PRIO = ['Crítica', 'Alta', 'Média', 'Baixa'];
const COR_PRIO = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const hm = (min) => (min ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : '—');

/** Indicadores individuais: chamados atendidos + serviços registrados por técnico. `chamados` já vem filtrado pelo período. */
export default function PorTecnico({ chamados, de, ate }) {
  const { perms } = useAuth(); const { logos } = useConfig();
  const { data: servAll } = useCollection(() => query(collection(db, 'servicos'), where('departamento', 'in', perms.depVariantes)), [perms.dep]);
  const servicos = useMemo(() => servAll.filter((s) => { const d = toDate(s.data); return d >= de && d <= ate; }), [servAll, de, ate]);
  const [sel, setSel] = useState('');

  const linhas = useMemo(() => {
    const m = {};
    const t = (n) => (m[n] ||= { nome: n, ch: 0, conc: 0, crit: 0, tempos: [], sv: 0, minutos: 0 });
    chamados.filter((c) => c.tecnico).forEach((c) => { const x = t(c.tecnico); x.ch++; if (c.status === 'Concluído') { x.conc++; if (c.data_atualizacao) x.tempos.push(toDate(c.data_atualizacao) - toDate(c.data_abertura)); } if (c.prioridade === 'Crítica') x.crit++; });
    servicos.filter((s) => s.tecnico).forEach((s) => { const x = t(s.tecnico); x.sv++; x.minutos += Number(s.minutos) || 0; });
    return Object.values(m).map((x) => ({ ...x, total: x.ch + x.sv, taxa: pct(x.conc, x.ch), medio: x.tempos.length ? x.tempos.reduce((a, b) => a + b, 0) / x.tempos.length : 0 })).sort((a, b) => b.total - a.total);
  }, [chamados, servicos]);

  const atual = linhas.find((l) => l.nome === sel);
  const chSel = atual ? chamados.filter((c) => c.tecnico === atual.nome) : [];
  const svSel = atual ? servicos.filter((s) => s.tecnico === atual.nome) : [];
  const catsSel = Object.entries(svSel.reduce((m, s) => { const k = s.categoria || 'Outros'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

  const csv = () => baixarArquivo('indicadores-por-tecnico.csv', paraCSV(linhas, [{ titulo: 'Técnico', valor: 'nome' }, { titulo: 'Chamados', valor: 'ch' }, { titulo: 'Concluídos', valor: 'conc' }, { titulo: 'Taxa %', valor: 'taxa' }, { titulo: 'Críticos', valor: 'crit' }, { titulo: 'Tempo médio', valor: (l) => (l.medio ? fmtDuracao(l.medio) : '') }, { titulo: 'Serviços', valor: 'sv' }, { titulo: 'Horas em serviços', valor: (l) => hm(l.minutos) }, { titulo: 'Total de atividades', valor: 'total' }]), 'text/csv;charset=utf-8');
  async function pdf() {
    try {
      const { jsPDF } = await import('jspdf'); const p = new jsPDF('p', 'mm', 'a4'); let y = 18;
      if (logos.hospital) { try { p.addImage(logos.hospital, 'PNG', 10, 6, 0, 12); } catch { /* */ } }
      const alvo = atual ? [atual] : linhas;
      p.setFontSize(15); p.text(atual ? `Indicadores — ${atual.nome}` : 'Indicadores por técnico', 105, y, { align: 'center' }); y += 6;
      p.setFontSize(9); p.text(`Período: ${de.toLocaleDateString('pt-BR')} a ${ate.toLocaleDateString('pt-BR')}`, 105, y, { align: 'center' }); y += 10;
      alvo.forEach((l) => {
        if (y > 255) { p.addPage(); y = 15; }
        p.setFontSize(12); p.text(l.nome, 12, y); y += 6; p.setFontSize(9);
        [`Chamados: ${l.ch} (concluídos ${l.conc}, ${l.taxa}%) · críticos ${l.crit} · tempo médio ${l.medio ? fmtDuracao(l.medio) : '—'}`, `Serviços registrados: ${l.sv} · tempo em serviços ${hm(l.minutos)} · total de atividades ${l.total}`].forEach((t) => { p.text(t, 14, y); y += 5; });
        y += 4;
      });
      if (atual && svSel.length) {
        p.setFontSize(12); p.text('Serviços', 12, y); y += 6; p.setFontSize(9);
        svSel.sort((a, b) => toDate(b.data) - toDate(a.data)).forEach((s) => { if (y > 280) { p.addPage(); y = 15; } p.text(`${toDate(s.data).toLocaleDateString('pt-BR')} · ${naturezaDe(s.natureza).label} · ${String(s.titulo).slice(0, 70)}`, 14, y); y += 5; });
      }
      p.save(`indicadores-tecnico-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { console.error(e); notify.error('Erro ao gerar o PDF.'); }
  }

  if (!linhas.length) return <div className="card"><EmptyState title="Sem atividades de técnicos no período" description="Atribua técnicos aos chamados e registre serviços para ver os indicadores." /></div>;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="filtros" style={{ alignItems: 'flex-end' }}>
        <Field label="Técnico"><select className="select" value={sel} onChange={(e) => setSel(e.target.value)}><option value="">Todos (comparativo)</option>{linhas.map((l) => <option key={l.nome}>{l.nome}</option>)}</select></Field>
        <span className="spacer" />
        <Button variant="outline" size="sm" icon={Download} onClick={csv}>CSV</Button><Button variant="outline" size="sm" icon={FileText} onClick={pdf}>PDF</Button>
      </div>

      {!atual ? (<>
        <GraficoCard title="Atividades por técnico (chamados + serviços)">
          <BarrasSeries empilhado labels={linhas.map((l) => l.nome)} series={[{ label: 'Chamados', data: linhas.map((l) => l.ch), cor: '#2f6fed' }, { label: 'Serviços', data: linhas.map((l) => l.sv), cor: '#10B981' }]} />
        </GraficoCard>
        <Card title="Ranking" icon={Trophy}><div className="table-card"><table><thead><tr><th>#</th><th>Técnico</th><th>Chamados</th><th>Concluídos</th><th>Taxa</th><th>Críticos</th><th>Tempo médio</th><th>Serviços</th><th>Horas em serviços</th><th>Total</th></tr></thead>
          <tbody>{linhas.map((l, i) => <tr key={l.nome} className="clicavel" onClick={() => setSel(l.nome)}><td>{['🥇', '🥈', '🥉'][i] || i + 1}</td><td><strong>{l.nome}</strong></td><td>{l.ch}</td><td>{l.conc}</td><td>{l.taxa}%</td><td>{l.crit}</td><td>{l.medio ? fmtDuracao(l.medio) : '—'}</td><td>{l.sv}</td><td>{hm(l.minutos)}</td><td><strong>{l.total}</strong></td></tr>)}</tbody></table></div></Card>
      </>) : (<>
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
          <StatCard icon={Ticket} label="Chamados atendidos" value={atual.ch} />
          <StatCard icon={CheckCircle2} tone="green" label="Concluídos" value={atual.conc} hint={`${atual.taxa}%`} />
          <StatCard icon={Clock} tone="amber" label="Tempo médio (chamados)" value={atual.medio ? fmtDuracao(atual.medio) : '—'} />
          <StatCard icon={ClipboardCheck} tone="purple" label="Serviços registrados" value={atual.sv} hint={hm(atual.minutos)} />
        </div>
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
          <GraficoCard title="Chamados por prioridade" small vazio={!chSel.length}><Rosca labels={PRIO} data={PRIO.map((p) => chSel.filter((c) => c.prioridade === p).length)} cores={COR_PRIO} /></GraficoCard>
          <GraficoCard title="Serviços por natureza" small vazio={!svSel.length}><Rosca labels={NATUREZAS.map((n) => n.label)} data={NATUREZAS.map((n) => svSel.filter((s) => s.natureza === n.id).length)} cores={NATUREZAS.map((n) => n.cor)} /></GraficoCard>
          <GraficoCard title="Serviços por categoria" small vazio={!catsSel.length}><Barras horizontal labels={catsSel.map((c) => c[0])} data={catsSel.map((c) => c[1])} cores="#7c5cfc" rotulo="Serviços" /></GraficoCard>
        </div>
      </>)}
    </div>
  );
}
