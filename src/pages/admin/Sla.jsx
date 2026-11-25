import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, FileText, Timer } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { useChamados } from '@/context/ChamadosContext';
import { useConfig } from '@/context/ConfigContext';
import { Card, EmptyState, PageHeader, PrioridadeBadge, SlaBadge, Spinner, StatCard } from '@/components/ui';
import { fmtData, fmtDuracao, toDate } from '@/lib/format';
import { slaEstado, slaPrazo, slaRestanteMs } from '@/lib/sla';
import { notify } from '@/lib/notify';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Sla() {
  const { tickets, loading } = useChamados(); const { sla, logos } = useConfig(); const nav = useNavigate();
  const pend = useMemo(() => tickets.filter((c) => c.status !== 'Concluído').sort((a, b) => slaRestanteMs(a, sla) - slaRestanteMs(b, sla)), [tickets, sla]);
  const n = (e) => pend.filter((c) => slaEstado(c, sla) === e).length;
  const ok = n('ok'), warn = n('warning'), crit = n('critical');

  async function pdf() {
    try {
      const { jsPDF } = await import('jspdf'); const p = new jsPDF('p', 'mm', 'a4'); let y = 18;
      if (logos.hospital) { try { p.addImage(logos.hospital, 'PNG', 10, 6, 0, 12); } catch { /* */ } }
      p.setFontSize(15); p.text('HelpHosp — Relatório de SLA', 105, y, { align: 'center' }); y += 6;
      p.setFontSize(9); p.text(`${new Date().toLocaleDateString('pt-BR')} · No prazo ${ok} · Próximos ${warn} · Atrasados ${crit}`, 105, y, { align: 'center' }); y += 10;
      p.setFillColor(11, 35, 64); p.rect(10, y - 4, 190, 6, 'F'); p.setTextColor(255);
      const xs = [12, 40, 100, 140, 170]; ['Protocolo', 'Título', 'Setor', 'Prioridade', 'Aberto'].forEach((h, i) => p.text(h, xs[i], y)); p.setTextColor(0); y += 6;
      pend.filter((c) => slaEstado(c, sla) === 'critical').forEach((c) => {
        if (y > 280) { p.addPage(); y = 15; }
        [c.protocolo, String(c.titulo || '').slice(0, 32), String(c.setor || '').slice(0, 20), c.prioridade, fmtData(c.data_abertura).slice(0, 10)].forEach((v, i) => p.text(String(v ?? '—'), xs[i], y)); y += 6;
      });
      p.save(`relatorio-sla-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { console.error(e); notify.error('Erro ao gerar o PDF.'); }
  }

  return (
    <>
      <PageHeader icon={Timer} title="Monitor de SLA" subtitle="Chamados pendentes por prazo de atendimento"
        actions={<button className="btn btn-outline btn-sm" onClick={pdf} disabled={!crit}><FileText size={14} /> Atrasados em PDF</button>} />
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', marginBottom: 16 }}>
        <StatCard icon={CheckCircle2} tone="green" label="No prazo" value={ok} />
        <StatCard icon={Clock} tone="amber" label="Próximos do prazo" value={warn} />
        <StatCard icon={AlertTriangle} tone="red" label="Atrasados" value={crit} />
        <StatCard icon={ClipboardList} label="Total pendente" value={pend.length} />
      </div>
      {loading ? <Spinner /> : pend.length === 0 ? <div className="card"><EmptyState title="Nenhum chamado pendente" /></div> : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,2fr) minmax(240px,1fr)', alignItems: 'start' }} className="sla-grid">
          <div className="table-card"><table><thead><tr><th>Protocolo</th><th>Título</th><th>Setor</th><th>Prioridade</th><th>Meta</th><th>Situação</th><th>Restante</th><th>Técnico</th></tr></thead>
            <tbody>{pend.map((c) => { const r = slaRestanteMs(c, sla); return (
              <tr key={c.id} className="clicavel" onClick={() => nav(`/admin/chamados/${c.id}`)} style={slaEstado(c, sla) === 'critical' ? { background: 'var(--red-bg)' } : undefined}>
                <td><strong>{c.protocolo}</strong></td><td>{c.titulo}</td><td>{c.setor}</td><td><PrioridadeBadge prioridade={c.prioridade} /></td>
                <td>{fmtDuracao(slaPrazo(c.prioridade, sla))}</td><td><SlaBadge chamado={c} overrides={sla} /></td>
                <td>{r > 0 ? fmtDuracao(r) : `−${fmtDuracao(-r)}`}</td><td>{c.tecnico || '—'}</td></tr>); })}</tbody></table></div>
          <Card title="Distribuição"><div style={{ height: 240 }}>
            <Doughnut data={{ labels: ['No prazo', 'Próximos', 'Atrasados'], datasets: [{ data: [ok, warn, crit], backgroundColor: ['#10B981', '#F59E0B', '#EF4444'], borderWidth: 2 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' } } }} /></div></Card>
        </div>
      )}
    </>
  );
}
