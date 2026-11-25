import { SLA_TEMPOS } from './constants';
import { toDate } from './format';

/**
 * Metas de SLA (ms) por prioridade. `overrides` vem de configuracoes/sla
 * (ver ConfigContext) e pode trazer { 'Crítica': minutos, ... } em minutos
 * ou horas — o ConfigContext já normaliza para ms.
 */
export function slaPrazo(prioridade, overrides) {
  return (overrides && overrides[prioridade]) || SLA_TEMPOS[prioridade] || SLA_TEMPOS['Média'];
}

/** 'ok' | 'warning' | 'critical' | 'done' */
export function slaEstado(c, overrides) {
  if (c.status === 'Concluído') return 'done';
  const prazo = slaPrazo(c.prioridade, overrides);
  const restante = prazo - (Date.now() - toDate(c.data_abertura).getTime());
  if (restante <= 0) return 'critical';
  if (restante < prazo * 0.3) return 'warning';
  return 'ok';
}
export const slaRestanteMs = (c, overrides) =>
  slaPrazo(c.prioridade, overrides) - (Date.now() - toDate(c.data_abertura).getTime());

export const SLA_ROTULO = { ok: 'No prazo', warning: 'Próximo do prazo', critical: 'Atrasado', done: 'Concluído' };
export const SLA_TOM = { ok: 'green', warning: 'amber', critical: 'red', done: 'gray' };
