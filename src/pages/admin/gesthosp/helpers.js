import { somenteDigitos, toDate, fmtData } from '@/lib/format';

/** `descricao` do cadastro GestHosp é um JSON (string) com dados pessoais. Tolerante a falhas. */
export function parseDados(c) {
  try {
    if (!c?.descricao) return {};
    const d = typeof c.descricao === 'string' ? JSON.parse(c.descricao) : c.descricao;
    return d && typeof d === 'object' ? d : {};
  } catch { return {}; }
}

/** CPF mascarado para a listagem: ***.***.***-45 */
export function cpfMascarado(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length < 11) return d ? '***' : '—';
  return `***.***.***-${d.slice(9)}`;
}

export const SECOES = [
  { id: 'pessoais', titulo: 'Dados pessoais', campos: [
    ['nome', 'Nome completo'], ['cpf', 'CPF'], ['rg', 'RG'], ['dataNascimento', 'Data de nascimento'], ['email', 'E-mail'], ['telefone', 'Telefone']] },
  { id: 'endereco', titulo: 'Endereço', campos: [
    ['cep', 'CEP'], ['logradouro', 'Logradouro'], ['numero', 'Número'], ['complemento', 'Complemento'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['estado', 'UF'], ['pais', 'País']] },
  { id: 'profissional', titulo: 'Dados profissionais', campos: [
    ['profissao', 'Profissão'], ['numConselho', 'Nº do conselho'], ['observacoes', 'Observações']] }
];

export function fmtDataNasc(v) {
  if (!v) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split('-').reverse().join('/');
  return String(v);
}

/** Texto para a área de transferência. */
export function textoParaCopiar(c, d) {
  const linhas = [`CADASTRO GESTHOSP — Protocolo ${c.protocolo || '—'}`, `Status: ${c.status || '—'} · Aberto em ${fmtData(c.data_abertura)}`, ''];
  SECOES.forEach((s) => {
    linhas.push(s.titulo.toUpperCase());
    s.campos.forEach(([k, rot]) => { if (d[k]) linhas.push(`${rot}: ${k === 'dataNascimento' ? fmtDataNasc(d[k]) : d[k]}`); });
    linhas.push('');
  });
  return linhas.join('\n').trim();
}

export const dataChamado = (c) => toDate(c.data_abertura);
