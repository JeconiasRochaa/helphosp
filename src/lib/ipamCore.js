// Lógica pura do gerenciamento de IPs (sem Firebase) — testável em Node.
import { intParaIp, ipParaInt, isIPv4, ipNaRede, parseCIDR, normalizarMAC } from './validators.js';

export const TIPOS = ['💻 Computador', '🖨️ Impressora', '🖧 Switch', '📡 Roteador', '📞 Telefone', '📷 Câmera', '📺 TV', '🖥️ Servidor'];
export const STATUS = ['Ativo', 'Inativo', 'Reservado'];
export const ATRIBUICOES = ['Estático', 'DHCP', 'Reservado'];
export const tipoRotulo = (t) => String(t || '').replace(/^[^\p{L}\p{N}]+/u, '').trim() || '—';

export const ipOrd = (ip) => (isIPv4(ip) ? ipParaInt(ip) : Number.MAX_SAFE_INTEGER);
export const cmpIp = (a, b) => ipOrd(a.ip) - ipOrd(b.ip);

/** Rede (doc) à qual um IP pertence, ou null. */
export function redeDoIp(ip, redes) {
  for (const r of redes) { const info = parseCIDR(r.cidr); if (info && ipNaRede(ip, info)) return r; }
  return null;
}

/** { ipDup: [[ip, [disp...]]], macDup: [[mac, [disp...]]], foraDeRede: [disp...] } */
export function detectarConflitos(disps, redes = []) {
  const porIp = new Map(), porMac = new Map();
  for (const d of disps) {
    const ip = String(d.ip || '').trim(); if (ip) porIp.set(ip, [...(porIp.get(ip) || []), d]);
    const mac = normalizarMAC(d.mac); if (mac && /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) porMac.set(mac, [...(porMac.get(mac) || []), d]);
  }
  const ipDup = [...porIp].filter(([, l]) => l.length > 1);
  const macDup = [...porMac].filter(([, l]) => l.length > 1);
  const foraDeRede = redes.length ? disps.filter((d) => isIPv4(d.ip) && !redeDoIp(d.ip, redes)) : [];
  const idsEmConflito = new Set([...ipDup, ...macDup].flatMap(([, l]) => l.map((d) => d.id)));
  return { ipDup, macDup, foraDeRede, idsEmConflito };
}

/** Procura duplicidade ao salvar. `ignorarId` = dispositivo em edição. Retorna string de erro ou null. */
export function validarDuplicidade(dados, disps, ignorarId) {
  const ip = String(dados.ip || '').trim(); const mac = normalizarMAC(dados.mac);
  const outroIp = disps.find((d) => d.id !== ignorarId && String(d.ip || '').trim() === ip);
  if (outroIp) return { campo: 'ip', msg: `O IP ${ip} já está em uso por "${outroIp.dispositivo}" (${outroIp.setor || 'sem setor'}).` };
  if (mac) { const outroMac = disps.find((d) => d.id !== ignorarId && normalizarMAC(d.mac) === mac); if (outroMac) return { campo: 'mac', msg: `O MAC ${mac} já está cadastrado em "${outroMac.dispositivo}".` }; }
  return null;
}

/** Próximo IP livre da rede (ignora gateway, faixa DHCP e IPs em uso). */
export function proximoIpLivre(rede, disps, { evitarDhcp = true } = {}) {
  const info = parseCIDR(rede?.cidr); if (!info) return null;
  const usados = new Set(disps.map((d) => ipOrd(d.ip)));
  if (isIPv4(rede.gateway)) usados.add(ipParaInt(rede.gateway));
  const dI = isIPv4(rede.dhcpInicio) ? ipParaInt(rede.dhcpInicio) : null, dF = isIPv4(rede.dhcpFim) ? ipParaInt(rede.dhcpFim) : null;
  for (let n = info.primeiro; n <= info.ultimo; n++) {
    if (usados.has(n)) continue;
    if (evitarDhcp && dI !== null && dF !== null && n >= dI && n <= dF) continue;
    return intParaIp(n);
  }
  return null;
}

/** Estatísticas da rede: total, usados, livres, por status. */
export function estatisticasRede(rede, disps) {
  const info = parseCIDR(rede?.cidr); if (!info) return null;
  const doBloco = disps.filter((d) => isIPv4(d.ip) && ipNaRede(d.ip, info));
  const porStatus = { Ativo: 0, Inativo: 0, Reservado: 0 }; doBloco.forEach((d) => { porStatus[d.status || 'Ativo'] = (porStatus[d.status || 'Ativo'] || 0) + 1; });
  const usados = new Set(doBloco.map((d) => d.ip)).size;
  return { info, total: info.total, usados, livres: info.total - usados, pct: info.total ? Math.round((usados / info.total) * 100) : 0, porStatus, dispositivos: doBloco };
}

/** Mapa de um bloco /24 (256 células) dentro da rede. `bloco` = índice do /24 a partir do início da rede. */
export function mapaBloco(rede, disps, bloco = 0, conflitos = new Set()) {
  const info = parseCIDR(rede?.cidr); if (!info) return [];
  const base = ((info.rede >>> 8) + bloco) << 8 >>> 0;
  const gw = isIPv4(rede.gateway) ? ipParaInt(rede.gateway) : null;
  const dI = isIPv4(rede.dhcpInicio) ? ipParaInt(rede.dhcpInicio) : null, dF = isIPv4(rede.dhcpFim) ? ipParaInt(rede.dhcpFim) : null;
  const porIp = new Map(); disps.forEach((d) => { if (isIPv4(d.ip)) porIp.set(ipParaInt(d.ip), [...(porIp.get(ipParaInt(d.ip)) || []), d]); });
  const cells = [];
  for (let i = 0; i < 256; i++) {
    const n = (base + i) >>> 0; const ip = intParaIp(n);
    let estado; const ds = porIp.get(n) || [];
    if (n < info.rede || n > info.broadcast) estado = 'fora';
    else if (n === info.rede || n === info.broadcast) estado = 'reservado-rede';
    else if (ds.length > 1 || ds.some((d) => conflitos.has(d.id))) estado = 'conflito';
    else if (gw === n && !ds.length) estado = 'gateway';
    else if (ds.length) estado = ds[0].status === 'Reservado' ? 'reservado' : ds[0].status === 'Inativo' ? 'inativo' : 'uso';
    else if (dI !== null && dF !== null && n >= dI && n <= dF) estado = 'dhcp';
    else estado = 'livre';
    cells.push({ i, n, ip, estado, disp: ds[0] || null, qtd: ds.length });
  }
  return cells;
}
export const qtdBlocos = (rede) => { const i = parseCIDR(rede?.cidr); return i ? Math.max(1, Math.ceil((i.broadcast - i.rede + 1) / 256)) : 0; };

// ------------------------------------------------------------ CSV
export const CSV_COLUNAS = ['dispositivo', 'tipo', 'ip', 'mac', 'setor', 'localizacao', 'status', 'atribuicao', 'hostname', 'vlan', 'responsavel', 'observacao'];
export function parseCSV(texto) {
  const t = texto.replace(/^﻿/, ''); const sep = (t.split('\n')[0].match(/;/g) || []).length >= (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const linhas = []; let cur = [], campo = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') q = false; else campo += c; }
    else if (c === '"') q = true; else if (c === sep) { cur.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; cur.push(campo); campo = ''; if (cur.some((x) => x.trim())) linhas.push(cur); cur = []; }
    else campo += c;
  }
  if (campo || cur.length) { cur.push(campo); if (cur.some((x) => x.trim())) linhas.push(cur); }
  return linhas;
}
/** Valida linhas do CSV. Retorna [{linha, dados, erros[]}]. */
export function validarImportacao(linhas, existentes) {
  if (!linhas.length) return [];
  const cab = linhas[0].map((c) => c.trim().toLowerCase());
  const idx = (n) => cab.indexOf(n);
  const vistosIp = new Set(), vistosMac = new Set();
  return linhas.slice(1).map((l, k) => {
    const g = (n) => (idx(n) >= 0 ? String(l[idx(n)] ?? '').trim() : '');
    const dados = { dispositivo: g('dispositivo'), tipo: g('tipo'), ip: g('ip'), mac: normalizarMAC(g('mac')), setor: g('setor'), localizacao: g('localizacao'), status: g('status') || 'Ativo', atribuicao: g('atribuicao') || 'Estático', hostname: g('hostname'), vlan: g('vlan'), responsavel: g('responsavel'), observacao: g('observacao') };
    const t = TIPOS.find((x) => x === dados.tipo || tipoRotulo(x).toLowerCase() === tipoRotulo(dados.tipo).toLowerCase()); if (t) dados.tipo = t;
    const erros = [];
    if (!dados.dispositivo) erros.push('Dispositivo obrigatório');
    if (!isIPv4(dados.ip)) erros.push('IP inválido');
    if (!dados.tipo || !TIPOS.includes(dados.tipo)) erros.push('Tipo inválido');
    if (!dados.setor) erros.push('Setor obrigatório');
    if (!STATUS.includes(dados.status)) erros.push('Status inválido');
    if (dados.mac && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(dados.mac)) erros.push('MAC inválido');
    if (!erros.length) {
      const dup = validarDuplicidade(dados, existentes); if (dup) erros.push(dup.msg);
      if (vistosIp.has(dados.ip)) erros.push('IP repetido no arquivo'); if (dados.mac && vistosMac.has(dados.mac)) erros.push('MAC repetido no arquivo');
      vistosIp.add(dados.ip); if (dados.mac) vistosMac.add(dados.mac);
    }
    return { linha: k + 2, dados, erros };
  });
}
export const diff = (antes, depois) => {
  const out = {}; for (const k of new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])) {
    if (['atualizadoEm', 'ultimaVerificacao', 'id', 'fid'].includes(k)) continue;
    if (JSON.stringify(antes?.[k] ?? '') !== JSON.stringify(depois?.[k] ?? '')) out[k] = [antes?.[k] ?? '', depois?.[k] ?? ''];
  } return out;
};
