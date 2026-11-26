import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, Field, PhotoPicker, Badge } from '@/components/ui';
import { CATEGORIAS_PADRAO, DEPARTAMENTO_INFO, FOTO_MAX_PORTAL, PRIORIDADE_POR_CATEGORIA } from '@/lib/constants';
import { criarChamadoPortal } from '@/lib/chamadosApi';
import { mascaraTelefone } from '@/lib/format';
import { notify } from '@/lib/notify';

const tituloDe = (t) => { const l = String(t).trim().split(/\n/)[0].replace(/\s+/g, ' '); return l.length > 80 ? l.slice(0, 77).trimEnd() + '…' : l; };
const PRIO_TOM = { Baixa: 'blue', Média: 'amber', Alta: 'red', Crítica: 'red' };

export default function AbrirChamado() {
  const { dep: depParam } = useParams();
  const dep = decodeURIComponent(depParam || '');
  const { setores, departamentos } = useConfig();
  const { deviceUid } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ solicitante: '', contato: '', setor: '', categoria: '', descricao: '' });
  const [fotos, setFotos] = useState([]);
  const [prog, setProg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [erros, setErros] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const cats = CATEGORIAS_PADRAO[dep] || ['Problema geral', 'Solicitação', 'Dúvida', 'Outros'];
  const prioridade = useMemo(() => PRIORIDADE_POR_CATEGORIA[f.categoria] || 'Média', [f.categoria]);
  const info = DEPARTAMENTO_INFO[dep] || { titulo: dep };

  if (departamentos.length && !departamentos.includes(dep)) return <Navigate to="/" replace />;

  async function enviar(e) {
    e.preventDefault();
    const er = {};
    if (!f.solicitante.trim()) er.solicitante = 'Informe seu nome.';
    if (!f.setor) er.setor = 'Selecione o setor.';
    if (!f.categoria) er.categoria = 'Selecione o tipo de problema.';
    if (f.descricao.trim().length < 6) er.descricao = 'Descreva o problema com um pouco mais de detalhe.';
    setErros(er);
    if (Object.keys(er).length) return notify.warning('Confira os campos destacados.');
    if (!deviceUid) return notify.error('Aguarde a identificação do aparelho e tente de novo.');
    setBusy(true);
    try {
      const r = await criarChamadoPortal({ ...f, solicitante: f.solicitante.trim(), titulo: tituloDe(f.descricao), descricao: f.descricao.trim(), departamento: dep, prioridade }, fotos, setProg);
      notify.success(`Protocolo ${r.protocolo} · prioridade ${prioridade}`, { titulo: 'Chamado registrado', duracao: 9000 });
      if (r.falhaFotos) notify.warning('As fotos não puderam ser anexadas, mas o chamado foi aberto.');
      nav(`/meus-chamados/${r.id}`, { replace: true });
    } catch (err) {
      console.error(err);
      notify.error(err.code === 'permission-denied' ? 'Sem permissão para abrir chamado. Atualize a página e tente novamente.' : 'Não conseguimos registrar o chamado. Verifique sua conexão.');
    } finally { setBusy(false); setProg(0); }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Link to="/" className="row muted text-sm" style={{ textDecoration: 'none', marginBottom: 12 }}><ArrowLeft size={14} /> Voltar</Link>
      <Card title={`Chamado — ${info.titulo}`} actions={<Badge tone="blue">Será encaminhado para {dep === 'MANUTENCAO' ? 'MANUTENÇÃO' : dep}</Badge>}>
        <div className="stack" style={{ gap: 14 }}>
          <div className="form-row">
            <Field label="Seu nome" required error={erros.solicitante}><input className="input" autoComplete="name" value={f.solicitante} onChange={set('solicitante')} /></Field>
            <Field label="Contato (WhatsApp ou ramal)"><input className="input" inputMode="tel" value={f.contato} onChange={(e) => setF((s) => ({ ...s, contato: mascaraTelefone(e.target.value) }))} placeholder="(00) 00000-0000" /></Field>
          </div>
          <div className="form-row">
            <Field label="Setor" required error={erros.setor}><select className="select" value={f.setor} onChange={set('setor')}><option value="">Selecione o setor…</option>{setores.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Tipo de problema" required error={erros.categoria}><select className="select" value={f.categoria} onChange={set('categoria')}><option value="">Selecione…</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          </div>
          {f.categoria && <div className="row text-sm muted">Prioridade definida automaticamente: <Badge tone={PRIO_TOM[prioridade]}>{prioridade}</Badge></div>}
          <Field label="Descreva o problema" required error={erros.descricao} hint="Diga o que aconteceu e onde. Quanto mais detalhes, mais rápido o atendimento."><textarea className="textarea" rows={5} maxLength={2000} value={f.descricao} onChange={set('descricao')} placeholder="Ex.: O computador da recepção não liga desde cedo." /></Field>
          <Field label={`Fotos do problema (opcional, até ${FOTO_MAX_PORTAL})`}><PhotoPicker value={fotos} onChange={setFotos} max={FOTO_MAX_PORTAL} /></Field>
          {busy && fotos.length > 0 && <div className="progress"><div style={{ width: `${Math.max(prog, 3)}%` }} /></div>}
          <Button type="submit" size="lg" icon={Send} loading={busy} block>{busy && fotos.length ? 'Enviando fotos…' : 'Enviar chamado'}</Button>
        </div>
      </Card>
    </form>
  );
}
