import { toDate, isValidDate } from '@/lib/format';
import { slaPrazo } from '@/lib/sla';

export const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);

export const abertura = (c) => toDate(c.data_abertura);
export const dataConclusao = (c) => (isValidDate(c.data_conclusao) ? toDate(c.data_conclusao) : isValidDate(c.data_atualizacao) ? toDate(c.data_atualizacao) : null);

/** Tempo de atendimento (ms) de um chamado concluído; null se não calculável. */
export function tempoAtendimentoMs(c) {
  if (c.status !== 'Concluído' || !isValidDate(c.data_abertura)) return null;
  const fim = dataConclusao(c);
  if (!fim) return null;
  const ms = fim.getTime() - abertura(c).getTime();
  return ms >= 0 ? ms : null;
}
export function tempoMedioMs(lista) {
  const t = lista.map(tempoAtendimentoMs).filter((v) => v != null);
  return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null;
}

/** Um chamado violou o SLA? (concluído depois do prazo, ou aberto e já vencido) */
export function violouSla(c, sla, agora = Date.now()) {
  if (!isValidDate(c.data_abertura)) return false;
  const prazo = slaPrazo(c.prioridade, sla);
  if (c.status === 'Concluído') {
    const t = tempoAtendimentoMs(c);
    return t != null && t > prazo;
  }
  return agora - abertura(c).getTime() > prazo;
}
/** % de chamados dentro do prazo (concluídos no prazo + abertos ainda no prazo). null se não houver chamados. */
export function conformidadeSla(lista, sla, agora = Date.now()) {
  if (!lista.length) return null;
  const ruins = lista.filter((c) => violouSla(c, sla, agora)).length;
  return Math.round(((lista.length - ruins) / lista.length) * 100);
}

export function contarPor(lista, fn) {
  const m = new Map();
  lista.forEach((c) => { const k = fn(c); m.set(k, (m.get(k) || 0) + 1); });
  return m;
}
export const topN = (lista, fn, n = 5) => [...contarPor(lista, fn).entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'pt-BR')).slice(0, n);

export const inicioDoDia = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const fimDoDia = (d = new Date()) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
export const chaveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Formata ms como "2h 15min" (versão curta para métricas). */
export function fmtHoras(ms) {
  if (ms == null) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${String(m % 60).padStart(2, '0')}min`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const dataValida = (v) => isValidDate(v);

/** Série diária (abertos x concluídos) dos últimos `dias` dias, incluindo hoje. */
export function serieDiaria(lista, dias, agora = new Date()) {
  const base = inicioDoDia(agora);
  const idx = new Map();
  const dados = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    idx.set(chaveDia(d), dados.length);
    dados.push({ data: d, abertos: 0, concluidos: 0 });
  }
  lista.forEach((c) => {
    if (isValidDate(c.data_abertura)) { const i = idx.get(chaveDia(abertura(c))); if (i != null) dados[i].abertos++; }
    if (c.status === 'Concluído') { const f = dataConclusao(c); const i = f ? idx.get(chaveDia(f)) : null; if (i != null) dados[i].concluidos++; }
  });
  return dados;
}
