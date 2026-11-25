import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement,
  Tooltip, Legend, Filler
} from 'chart.js';

// Registro único dos componentes do Chart.js (importado pelos gráficos do Dashboard, SLA e Indicadores).
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

const css = (nome, fallback) => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return v || fallback;
  } catch { return fallback; }
};

export function lerTema() {
  return {
    text: css('--text', '#1b2430'),
    text2: css('--text-2', '#6b778a'),
    grid: css('--border', '#e6eaf2'),
    card: css('--card', '#ffffff'),
    blue: css('--blue', '#2f6fed'),
    green: css('--success', '#16a34a'),
    red: css('--danger', '#e5484d'),
    amber: css('--warning', '#f59e0b'),
    purple: css('--purple', '#7c5cfc'),
    teal: css('--teal', '#0fb5b0')
  };
}

/** Cores dos gráficos lidas das CSS vars; recalcula quando o tema (data-theme) muda. */
export function useChartTheme() {
  const [t, setT] = useState(lerTema);
  useEffect(() => {
    const obs = new MutationObserver(() => setT(lerTema()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    setT(lerTema());
    return () => obs.disconnect();
  }, []);
  return t;
}

export const withAlpha = (hex, a) => {
  const h = String(hex || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(h)) {
    const n = parseInt(h.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return h;
};

/** Paletas por significado (status/prioridade/sla) e sequência categórica. */
export const coresStatus = (t) => ({ 'A Fazer': t.blue, 'Em Andamento': t.amber, 'Pendente': t.red, 'Concluído': t.green });
export const coresPrioridade = (t) => ({ 'Baixa': t.green, 'Média': t.amber, 'Alta': '#f97316', 'Crítica': t.red });
export const sequencia = (t) => [t.blue, t.green, t.amber, t.purple, t.teal, '#ec4899', t.red, '#6366f1', '#f97316', '#06b6d4'];

/** Opções base para gráficos cartesianos. */
export function opcoesCartesiano(t, { horizontal = false, legenda = false, empilhado = false, stepSize1 = true } = {}) {
  const eixoValor = { beginAtZero: true, grid: { color: t.grid }, ticks: { color: t.text2, precision: 0, ...(stepSize1 ? {} : {}) }, border: { display: false }, stacked: empilhado };
  const eixoCat = { grid: { display: false }, ticks: { color: t.text2 }, border: { color: t.grid }, stacked: empilhado };
  return {
    responsive: true, maintainAspectRatio: false, indexAxis: horizontal ? 'y' : 'x',
    scales: horizontal ? { x: eixoValor, y: eixoCat } : { x: eixoCat, y: eixoValor },
    plugins: {
      legend: legenda ? { position: 'bottom', labels: { color: t.text2, usePointStyle: true, padding: 16 } } : { display: false },
      tooltip: { padding: 10, cornerRadius: 8 }
    }
  };
}

/** Opções base para rosca/pizza, com percentual no tooltip. */
export function opcoesRosca(t, { cutout = '66%' } = {}) {
  return {
    responsive: true, maintainAspectRatio: false, cutout,
    plugins: {
      legend: { position: 'bottom', labels: { color: t.text2, usePointStyle: true, padding: 14, font: { size: 11 } } },
      tooltip: {
        padding: 10, cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return ` ${ctx.label}: ${ctx.raw} (${total > 0 ? Math.round((ctx.raw / total) * 100) : 0}%)`;
          }
        }
      }
    }
  };
}

/** Re-renderiza a cada `ms` (contagens regressivas ao vivo). */
export function useAgora(ms = 30000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return agora;
}
