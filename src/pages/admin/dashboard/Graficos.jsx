import { Doughnut, Bar, Line, Pie } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { opcoesCartesiano, opcoesRosca, useChartTheme, withAlpha } from './chartSetup';

/** Card com gráfico dentro; mostra estado vazio quando `vazio` (sem dados). */
export function GraficoCard({ title, icon, actions, vazio, small, children, className, refGrafico }) {
  return (
    <Card title={title} icon={icon} actions={actions} className={className}>
      {vazio ? <EmptyState icon={BarChart3} title="Sem dados no período">Nenhum chamado para exibir neste gráfico.</EmptyState>
        : <div className={`db-chart${small ? ' db-sm' : ''}`} ref={refGrafico}>{children}</div>}
    </Card>
  );
}

export function Rosca({ labels, data, cores, cutout, pizza }) {
  const t = useChartTheme();
  const ds = { data, backgroundColor: cores, borderWidth: 3, borderColor: t.card, hoverOffset: 6 };
  const opts = opcoesRosca(t, { cutout: pizza ? 0 : (cutout || '66%') });
  const Cmp = pizza ? Pie : Doughnut;
  return <Cmp data={{ labels, datasets: [ds] }} options={opts} aria-label="Gráfico de distribuição" role="img" />;
}

export function Barras({ labels, data, cores, horizontal, rotulo = 'Chamados', formatoTooltip }) {
  const t = useChartTheme();
  const opts = opcoesCartesiano(t, { horizontal });
  opts.plugins.tooltip.callbacks = { label: (c) => formatoTooltip ? formatoTooltip(c.raw) : ` ${c.raw} ${rotulo.toLowerCase()}` };
  return <Bar data={{ labels, datasets: [{ label: rotulo, data, backgroundColor: cores, borderRadius: 6, borderSkipped: false, maxBarThickness: 44 }] }} options={opts} role="img" aria-label={rotulo} />;
}

/** series: [{ label, data, cor }] */
export function Linhas({ labels, series, area = true }) {
  const t = useChartTheme();
  const opts = opcoesCartesiano(t, { legenda: true });
  opts.interaction = { mode: 'index', intersect: false };
  return (
    <Line options={opts} role="img" aria-label="Tendência"
      data={{ labels, datasets: series.map((s) => ({ label: s.label, data: s.data, borderColor: s.cor, backgroundColor: withAlpha(s.cor, .14), fill: area, tension: .35, pointRadius: labels.length > 20 ? 0 : 3, pointHoverRadius: 5, borderWidth: 2.5 })) }} />
  );
}

/** Barras agrupadas/empilhadas com várias séries. series: [{ label, data, cor }] */
export function BarrasSeries({ labels, series, empilhado }) {
  const t = useChartTheme();
  const opts = opcoesCartesiano(t, { legenda: true, empilhado });
  return <Bar options={opts} role="img" aria-label="Gráfico de barras" data={{ labels, datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: s.cor, borderRadius: 5, maxBarThickness: 40 })) }} />;
}
