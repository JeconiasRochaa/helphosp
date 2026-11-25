/** Intervalo [início, fim] a partir do tipo de filtro de período. */
export function periodo(tipo, ini, fim) {
  const hoje = new Date(); const a = new Date(hoje); const f = new Date(hoje); f.setHours(23, 59, 59, 999);
  if (['7', '30', '90', '365'].includes(tipo)) { a.setDate(a.getDate() - Number(tipo)); a.setHours(0, 0, 0, 0); return [a, f]; }
  if (tipo === 'mes') return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)];
  if (tipo === 'mes_anterior') return [new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59)];
  if (tipo === 'ano') return [new Date(hoje.getFullYear(), 0, 1), f];
  if (ini && fim) return [new Date(ini + 'T00:00:00'), new Date(fim + 'T23:59:59')];
  a.setDate(a.getDate() - 30); a.setHours(0, 0, 0, 0); return [a, f];
}
export const OPCOES_PERIODO = [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['mes', 'Este mês'], ['mes_anterior', 'Mês anterior'], ['ano', 'Este ano'], ['personalizado', 'Personalizado']];
