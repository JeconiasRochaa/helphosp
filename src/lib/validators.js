// ---------- IPv4 / CIDR / MAC (usado em IPs & Rede) ----------
export const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
export const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
export const isIPv4 = (s) => ipv4Regex.test(String(s || '').trim());
export const isMAC = (s) => macRegex.test(String(s || '').trim());

export function ipParaInt(ip) {
  const p = String(ip).trim().split('.').map(Number);
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
export function intParaIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
export function normalizarMAC(s) {
  const h = String(s || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  return h.length === 12 ? h.match(/.{2}/g).join(':') : String(s || '').trim().toUpperCase();
}

/** Valida e decompõe "192.168.1.0/24". */
export function parseCIDR(cidr) {
  const m = String(cidr || '').trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m || !isIPv4(m[1])) return null;
  const prefixo = Number(m[2]);
  if (prefixo < 16 || prefixo > 30) return null; // faixas úteis para uma rede hospitalar
  const mascara = prefixo === 0 ? 0 : (0xffffffff << (32 - prefixo)) >>> 0;
  const rede = (ipParaInt(m[1]) & mascara) >>> 0;
  const broadcast = (rede | (~mascara >>> 0)) >>> 0;
  return {
    prefixo, mascara, rede, broadcast,
    primeiro: rede + 1, ultimo: broadcast - 1,
    total: broadcast - rede - 1,
    redeStr: intParaIp(rede), broadcastStr: intParaIp(broadcast), mascaraStr: intParaIp(mascara)
  };
}
export const ipNaRede = (ip, cidrInfo) => {
  if (!isIPv4(ip) || !cidrInfo) return false;
  const n = ipParaInt(ip);
  return n >= cidrInfo.primeiro && n <= cidrInfo.ultimo;
};

export const validarEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

/** Política de senha: mínimo 8, letra e número. Retorna mensagem de erro ou null. */
export function erroSenha(s) {
  if (!s || s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Use letras e números na senha.';
  if (/^(12345678|password|senha123|abcd1234)/i.test(s)) return 'Escolha uma senha menos previsível.';
  return null;
}
export function forcaSenha(s) {
  let p = 0;
  if (s.length >= 8) p++; if (s.length >= 12) p++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) p++;
  if (/\d/.test(s)) p++; if (/[^A-Za-z0-9]/.test(s)) p++;
  return Math.min(p, 4); // 0..4
}
