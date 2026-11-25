import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Field } from '@/components/ui';
import { ESTADOS_BRASIL } from '@/lib/constants';
import { mascaraCEP, mascaraCPF, mascaraTelefone, validarCPF } from '@/lib/format';
import { validarEmail } from '@/lib/validators';
import { criarChamadoPortal } from '@/lib/chamadosApi';
import { notify } from '@/lib/notify';

const VAZIO = { nome: '', cpf: '', rg: '', dataNascimento: '', email: '', telefone: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil', profissao: '', numConselho: '', observacoes: '' };

export default function GestHospForm() {
  const { deviceUid } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState(VAZIO); const [er, setEr] = useState({}); const [busy, setBusy] = useState(false);
  const set = (k, fn) => (e) => setF((s) => ({ ...s, [k]: fn ? fn(e.target.value) : e.target.value }));

  async function buscarCEP() {
    const cep = f.cep.replace(/\D/g, ''); if (cep.length !== 8) return;
    try {
      const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (d.erro) return notify.warning('CEP não encontrado.');
      setF((s) => ({ ...s, logradouro: d.logradouro || s.logradouro, bairro: d.bairro || s.bairro, cidade: d.localidade || s.cidade, estado: d.uf || s.estado, complemento: d.complemento || s.complemento }));
      notify.success('Endereço preenchido automaticamente.', { som: false });
    } catch { notify.warning('Não foi possível consultar o CEP agora.'); }
  }
  async function enviar(e) {
    e.preventDefault();
    const x = {};
    ['nome', 'cpf', 'email', 'telefone', 'profissao', 'cidade', 'estado'].forEach((k) => { if (!String(f[k]).trim()) x[k] = 'Obrigatório.'; });
    if (f.cpf && !validarCPF(f.cpf)) x.cpf = 'CPF inválido.';
    if (f.email && !validarEmail(f.email)) x.email = 'E-mail inválido.';
    setEr(x); if (Object.keys(x).length) return notify.warning('Confira os campos destacados.');
    if (!deviceUid) return notify.error('Aguarde a identificação do aparelho.');
    setBusy(true);
    try {
      const r = await criarChamadoPortal({ departamento: 'TI', tipo: 'gesthosp', titulo: `Cadastro GestHosp — ${f.nome}`, descricao: JSON.stringify(f), solicitante: f.nome, contato: f.telefone, setor: 'GestHosp', categoria: 'Cadastro de profissional', prioridade: 'Média' });
      notify.success(`Protocolo ${r.protocolo}. A equipe de TI dará andamento.`, { titulo: 'Solicitação enviada', duracao: 9000 });
      nav(`/meus-chamados/${r.id}`, { replace: true });
    } catch (err) { console.error(err); notify.error('Não foi possível enviar a solicitação.'); } finally { setBusy(false); }
  }
  const I = (k, label, props = {}, req) => <Field label={label} required={req} error={er[k]}><input className="input" value={f[k]} onChange={set(k, props.mask)} {...props.attrs} /></Field>;
  return (
    <form onSubmit={enviar} noValidate className="stack" style={{ gap: 14 }}>
      <Link to="/" className="row muted text-sm" style={{ textDecoration: 'none' }}><ArrowLeft size={14} /> Voltar</Link>
      <div className="lgpd-box"><Lock size={15} />Seus dados pessoais são protegidos (LGPD): só a equipe de TI consegue visualizá-los.</div>
      <Card title="Dados pessoais"><div className="stack">
        {I('nome', 'Nome completo', {}, true)}
        <div className="form-row">{I('cpf', 'CPF', { mask: mascaraCPF, attrs: { inputMode: 'numeric' } }, true)}{I('rg', 'RG')}</div>
        <div className="form-row">{I('dataNascimento', 'Data de nascimento', { attrs: { type: 'date' } })}{I('telefone', 'Telefone', { mask: mascaraTelefone, attrs: { inputMode: 'tel' } }, true)}</div>
        {I('email', 'E-mail', { attrs: { type: 'email' } }, true)}
      </div></Card>
      <Card title="Endereço"><div className="stack">
        <div className="form-row"><Field label="CEP"><input className="input" value={f.cep} onChange={set('cep', mascaraCEP)} onBlur={buscarCEP} inputMode="numeric" /></Field>{I('logradouro', 'Logradouro')}</div>
        <div className="form-row">{I('numero', 'Número')}{I('complemento', 'Complemento')}</div>
        <div className="form-row">{I('bairro', 'Bairro')}{I('cidade', 'Cidade', {}, true)}</div>
        <div className="form-row"><Field label="Estado" required error={er.estado}><select className="select" value={f.estado} onChange={set('estado')}><option value="">Selecione…</option>{ESTADOS_BRASIL.map((s) => <option key={s.sigla} value={s.sigla}>{s.nome}</option>)}</select></Field>{I('pais', 'País')}</div>
      </div></Card>
      <Card title="Dados profissionais"><div className="stack">
        <div className="form-row">{I('profissao', 'Profissão', {}, true)}{I('numConselho', 'Nº do conselho')}</div>
        <Field label="Observações"><textarea className="textarea" rows={3} value={f.observacoes} onChange={set('observacoes')} /></Field>
      </div></Card>
      <Button type="submit" size="lg" icon={Send} loading={busy} block>Solicitar cadastro</Button>
    </form>
  );
}
