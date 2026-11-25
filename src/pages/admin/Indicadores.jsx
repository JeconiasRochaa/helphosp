import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, ClipboardList, Clock, FileText, Presentation, Trophy } from 'lucide-react';
import { useChamados } from '@/context/ChamadosContext';
import { useConfig } from '@/context/ConfigContext';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, StatCard, Tabs } from '@/components/ui';
import PorTecnico from './indicadores/PorTecnico';
import { fmtDuracao, toDate } from '@/lib/format';
import { STATUS_LIST } from '@/lib/constants';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { Barras, BarrasSeries, GraficoCard, Linhas, Rosca } from './dashboard/Graficos';

const PRIO = ['Crítica', 'Alta', 'Média', 'Baixa'];
const COR_PRIO = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
const PALETA = ['#2f6fed', '#10B981', '#F59E0B', '#EF4444', '#7c5cfc', '#0fb5b0', '#ec4899', '#64748b', '#84cc16', '#f97316'];
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const contar = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const top = (obj, n = 10) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

function periodo(tipo, ini, fim) {
  const hoje = new Date(); const a = new Date(hoje); const f = new Date(hoje); f.setHours(23, 59, 59, 999);
  if (['7', '30', '90'].includes(tipo)) { a.setDate(a.getDate() - Number(tipo)); a.setHours(0, 0, 0, 0); return [a, f]; }
  if (tipo === 'mes') return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)];
  if (tipo === 'mes_anterior') return [new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59)];
  if (ini && fim) return [new Date(ini + 'T00:00:00'), new Date(fim + 'T23:59:59')];
  a.setDate(a.getDate() - 30); return [a, f];
}

export default function Indicadores() {
  const { tickets, loading } = useChamados(); const { logos } = useConfig();
  const [aba, setAba] = useState('geral');
  const [tipo, setTipo] = useState('30'); const [ini, setIni] = useState(''); const [fim, setFim] = useState('');
  const [de, ate] = useMemo(() => periodo(tipo, ini, fim), [tipo, ini, fim]);
  const f = useMemo(() => tickets.filter((c) => { const d = toDate(c.data_abertura); return d >= de && d <= ate; }), [tickets, de, ate]);

  const d = useMemo(() => {
    const total = f.length; const conc = f.filter((c) => c.status === 'Concluído');
    const tempos = conc.filter((c) => c.data_atualizacao).map((c) => toDate(c.data_atualizacao) - toDate(c.data_abertura)).filter((t) => t >= 0);
    const medio = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const porDia = contar(f, (c) => toDate(c.data_abertura).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    const dias = []; for (let x = new Date(de); x <= ate && dias.length < 92; x.setDate(x.getDate() + 1)) dias.push(x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    const sem = contar(f, (c) => toDate(c.data_abertura).getDay());
    const tec = {};
    f.filter((c) => c.tecnico).forEach((c) => { const t = (tec[c.tecnico] ||= { total: 0, conc: 0, crit: 0, tempos: [] }); t.total++; if (c.status === 'Concluído') { t.conc++; if (c.data_atualizacao) t.tempos.push(toDate(c.data_atualizacao) - toDate(c.data_abertura)); } if (c.prioridade === 'Crítica') t.crit++; });
    const ranking = Object.entries(tec).map(([nome, t]) => ({ nome, ...t, taxa: pct(t.conc, t.total), medio: t.tempos.length ? t.tempos.reduce((a, b) => a + b, 0) / t.tempos.length : 0 })).sort((a, b) => b.taxa - a.taxa || b.conc - a.conc);
    return { total, conc: conc.length, taxa: pct(conc.length, total), medio, dias, porDia, sem, ranking,
      prio: PRIO.map((p) => f.filter((c) => c.prioridade === p).length), status: STATUS_LIST.map((s) => f.filter((c) => c.status === s).length),
      cats: top(contar(f, (c) => c.categoria || 'Outros')), setores: top(contar(f, (c) => c.setor || '—'), 8) };
  }, [f, de, ate]);

  async function pdf() {
    try {
      const { jsPDF } = await import('jspdf'); const p = new jsPDF('p', 'mm', 'a4'); let y = 18;
      if (logos.hospital) { try { p.addImage(logos.hospital, 'PNG', 10, 6, 0, 12); } catch { /* */ } }
      if (logos.governo) { try { p.addImage(logos.governo, 'PNG', 160, 6, 0, 12); } catch { /* */ } }
      p.setFontSize(15); p.text('HelpHosp — Indicadores', 105, y, { align: 'center' }); y += 6;
      p.setFontSize(9); p.text(`Período: ${de.toLocaleDateString('pt-BR')} a ${ate.toLocaleDateString('pt-BR')}`, 105, y, { align: 'center' }); y += 10;
      p.setFontSize(11); p.text(`Total: ${d.total}   Concluídos: ${d.conc} (${d.taxa}%)   Tempo médio: ${d.medio ? fmtDuracao(d.medio) : '—'}`, 12, y); y += 10;
      const bloco = (t, linhas) => { p.setFontSize(12); p.text(t, 12, y); y += 6; p.setFontSize(9); linhas.forEach((l) => { if (y > 280) { p.addPage(); y = 15; } p.text(l, 14, y); y += 5; }); y += 4; };
      bloco('Por prioridade', PRIO.map((n, i) => `${n}: ${d.prio[i]} (${pct(d.prio[i], d.total)}%)`));
      bloco('Por status', STATUS_LIST.map((n, i) => `${n}: ${d.status[i]} (${pct(d.status[i], d.total)}%)`));
      bloco('Por setor', d.setores.map(([n, q]) => `${n}: ${q}`));
      bloco('Categorias', d.cats.map(([n, q]) => `${n}: ${q} (${pct(q, d.total)}%)`));
      bloco('Técnicos', d.ranking.map((t) => `${t.nome}: ${t.total} chamados, ${t.conc} concluídos (${t.taxa}%), médio ${t.medio ? fmtDuracao(t.medio) : '—'}`));
      p.save(`indicadores-${new Date().toISOString().slice(0, 10)}.pdf`); audit('indicadores.pdf'); notify.success('PDF gerado.');
    } catch (e) { console.error(e); notify.error('Erro ao gerar o PDF.'); }
  }
  async function ppt() {
    try {
      const mod = await import('pptxgenjs'); const Pptx = mod.default || mod; const p = new Pptx(); p.layout = 'LAYOUT_WIDE';
      const s1 = p.addSlide(); s1.background = { color: '0B2340' };
      if (logos.hospital) { try { s1.addImage({ data: logos.hospital, x: 0.5, y: 0.4, h: 0.9 }); } catch { /* */ } }
      s1.addText('HelpHosp — Indicadores', { x: 0.5, y: 2.6, w: 12, fontSize: 36, bold: true, color: 'FFFFFF' });
      s1.addText(`${de.toLocaleDateString('pt-BR')} a ${ate.toLocaleDateString('pt-BR')}`, { x: 0.5, y: 3.6, fontSize: 18, color: 'CBD5E1' });
      const s2 = p.addSlide(); s2.addText('Resumo', { x: 0.5, y: 0.4, fontSize: 24, bold: true, color: '0B2340' });
      s2.addText(`Total ${d.total} · Concluídos ${d.conc} (${d.taxa}%) · Tempo médio ${d.medio ? fmtDuracao(d.medio) : '—'}`, { x: 0.5, y: 1.1, fontSize: 14 });
      const tb = (h, rows) => [h.map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: '0B2340' } } })), ...rows.map((r) => r.map(String))];
      s2.addTable(tb(['Status', 'Qtd', '%'], STATUS_LIST.map((n, i) => [n, d.status[i], pct(d.status[i], d.total) + '%'])), { x: 0.5, y: 1.8, w: 6, fontSize: 11 });
      s2.addTable(tb(['Prioridade', 'Qtd', '%'], PRIO.map((n, i) => [n, d.prio[i], pct(d.prio[i], d.total) + '%'])), { x: 7, y: 1.8, w: 5.5, fontSize: 11 });
      const s3 = p.addSlide(); s3.addText('Setores e categorias', { x: 0.5, y: 0.4, fontSize: 24, bold: true, color: '0B2340' });
      s3.addTable(tb(['Setor', 'Qtd'], d.setores), { x: 0.5, y: 1.2, w: 5.5, fontSize: 11 });
      s3.addTable(tb(['Categoria', 'Qtd', '%'], d.cats.map(([n, q]) => [n, q, pct(q, d.total) + '%'])), { x: 7, y: 1.2, w: 5.5, fontSize: 11 });
      if (d.ranking.length) { const s4 = p.addSlide(); s4.addText('Técnicos', { x: 0.5, y: 0.4, fontSize: 24, bold: true, color: '0B2340' });
        s4.addTable(tb(['Técnico', 'Total', 'Concluídos', 'Taxa', 'Tempo médio'], d.ranking.map((t) => [t.nome, t.total, t.conc, t.taxa + '%', t.medio ? fmtDuracao(t.medio) : '—'])), { x: 0.5, y: 1.2, w: 12, fontSize: 11 }); }
      await p.writeFile({ fileName: `indicadores-${new Date().toISOString().slice(0, 10)}.pptx` }); audit('indicadores.ppt'); notify.success('Apresentação gerada.');
    } catch (e) { console.error(e); notify.error('Erro ao gerar a apresentação.'); }
  }

  return (
    <>
      <PageHeader icon={BarChart3} title="Indicadores" subtitle="Análise de desempenho por período"
        actions={<><Button variant="outline" size="sm" icon={FileText} onClick={pdf} disabled={!f.length}>PDF</Button><Button variant="outline" size="sm" icon={Presentation} onClick={ppt} disabled={!f.length}>PowerPoint</Button></>} />
      <div className="filtros" style={{ alignItems: 'flex-end' }}>
        <Field label="Período"><select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="mes">Este mês</option><option value="mes_anterior">Mês anterior</option><option value="personalizado">Personalizado</option></select></Field>
        {tipo === 'personalizado' && <><Field label="De"><input className="input" type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></Field><Field label="Até"><input className="input" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></Field></>}
      </div>
      <Tabs value={aba} onChange={setAba} tabs={[{ id: 'geral', label: 'Visão geral', icon: BarChart3 }, { id: 'tecnico', label: 'Por técnico', icon: Trophy }]} />
      {loading ? <Spinner /> : aba === 'tecnico' ? <PorTecnico chamados={f} de={de} ate={ate} /> : (<>
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', margin: '12px 0 16px' }}>
          <StatCard icon={ClipboardList} label="Chamados" value={d.total} /><StatCard icon={CheckCircle2} tone="green" label="Concluídos" value={d.conc} hint={`${d.taxa}%`} />
          <StatCard icon={Clock} tone="amber" label="Tempo médio" value={d.medio ? fmtDuracao(d.medio) : '—'} /><StatCard icon={Trophy} tone="purple" label="Técnicos ativos" value={d.ranking.length} />
        </div>
        {d.total === 0 ? <div className="card"><EmptyState title="Sem chamados no período" /></div> : (
          <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
            <GraficoCard title="Evolução diária"><Linhas labels={d.dias} series={[{ label: 'Chamados', data: d.dias.map((x) => d.porDia[x] || 0), cor: '#2f6fed' }]} /></GraficoCard>
            <GraficoCard title="Por prioridade" small><Rosca labels={PRIO} data={d.prio} cores={COR_PRIO} /></GraficoCard>
            <GraficoCard title="Por status"><Barras labels={STATUS_LIST} data={d.status} cores={PALETA} /></GraficoCard>
            <GraficoCard title="Dia da semana"><Barras labels={DIAS} data={DIAS.map((_, i) => d.sem[i] || 0)} cores={PALETA[0]} /></GraficoCard>
            <GraficoCard title="Categorias (top 10)" vazio={!d.cats.length}><Barras horizontal labels={d.cats.map((c) => c[0])} data={d.cats.map((c) => c[1])} cores={PALETA[4]} /></GraficoCard>
            <GraficoCard title="Setores" small><Rosca pizza labels={d.setores.map((c) => c[0])} data={d.setores.map((c) => c[1])} cores={PALETA} /></GraficoCard>
          </div>)}
        {d.ranking.length > 0 && <Card title="Desempenho dos técnicos" icon={Trophy} style={{ marginTop: 16 }}><div className="table-card"><table><thead><tr><th>#</th><th>Técnico</th><th>Total</th><th>Concluídos</th><th>Críticos</th><th>Taxa</th><th>Tempo médio</th></tr></thead>
          <tbody>{d.ranking.map((t, i) => <tr key={t.nome}><td>{['🥇', '🥈', '🥉'][i] || i + 1}</td><td><strong>{t.nome}</strong></td><td>{t.total}</td><td>{t.conc}</td><td>{t.crit}</td><td>{t.taxa}%</td><td>{t.medio ? fmtDuracao(t.medio) : '—'}</td></tr>)}</tbody></table></div></Card>}
      </>)}
    </>
  );
}
