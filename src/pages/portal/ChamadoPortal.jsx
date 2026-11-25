import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Check, Lock, MessageSquare, ShieldOff } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import Comentarios from '@/components/Comentarios';
import { Card, EmptyState, PhotoGallery, PrioridadeBadge, Spinner, StatusPill } from '@/components/ui';
import { fmtData, nomeDepartamento } from '@/lib/format';

const ETAPAS = ['A Fazer', 'Em Andamento', 'Pendente', 'Concluído'];

export default function ChamadoPortal() {
  const { id } = useParams();
  const { user } = useAuth();
  const [c, setC] = useState(undefined);

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'chamados', id), (s) => setC(s.exists() ? { id: s.id, ...s.data() } : null), () => setC(null));
  }, [id, user]);

  if (c === undefined) return <Spinner label="Carregando chamado…" />;
  if (c === null) return (
    <div className="card"><EmptyState icon={ShieldOff} title="Chamado não encontrado" action={<Link className="btn btn-primary" to="/meus-chamados">Meus chamados</Link>}>
      Este chamado não existe ou não foi aberto neste aparelho.</EmptyState></div>
  );
  const idx = ETAPAS.indexOf(c.status);
  const gest = c.tipo === 'gesthosp';

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link to="/meus-chamados" className="row muted text-sm" style={{ textDecoration: 'none' }}><ArrowLeft size={14} /> Meus chamados</Link>
      <Card>
        <div className="row-wrap"><div style={{ flex: 1, minWidth: 200 }}><h2 style={{ fontSize: 19 }}>{gest ? 'Solicitação de cadastro — GestHosp' : c.titulo}</h2><p className="muted text-sm mono">{c.protocolo}</p></div><StatusPill status={c.status} /></div>
        <div className="steps">{ETAPAS.map((e, i) => <div key={e} className={'step' + (i <= idx ? ' feito' : '') + (i === idx ? ' atual' : '')}><div className="bola">{i < idx || c.status === 'Concluído' ? <Check size={14} /> : i + 1}</div>{e}</div>)}</div>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          {[['Solicitante', c.solicitante], ['Setor', c.setor], ['Departamento', nomeDepartamento(c.departamento)], ['Aberto em', fmtData(c.data_abertura)], ['Técnico', c.tecnico || 'Aguardando'], c.executante && ['Executante', c.executante]].filter(Boolean).map(([k, v]) => (
            <div key={k}><div className="label">{k}</div><strong>{v || '—'}</strong></div>
          ))}
          {!gest && <div><div className="label">Prioridade</div><PrioridadeBadge prioridade={c.prioridade} /></div>}
        </div>
        {gest ? <div className="lgpd-box" style={{ marginTop: 14 }}><Lock size={15} />Os dados pessoais desta solicitação ficam visíveis apenas para a equipe de TI, conforme a LGPD.</div>
          : c.descricao && <><div className="divider" /><div className="label">Descrição</div><p style={{ whiteSpace: 'pre-wrap' }}>{c.descricao}</p></>}
        {(c.fotos?.length > 0 || c.fotos_equipe?.length > 0) && <div className="divider" />}
        <div className="stack">
          <PhotoGallery urls={c.fotos} titulo="Fotos que você enviou" />
          <PhotoGallery urls={c.fotos_equipe} titulo="Fotos da equipe técnica" />
        </div>
      </Card>

      <Card title="Mensagens com a equipe" icon={MessageSquare}><Comentarios chamado={c} modo="portal" /></Card>

      <Card title="Andamento">
        <div className="timeline">
          {(c.timeline || []).slice().reverse().map((t, i) => (
            <div key={i} className={'tl-item' + (t.status === 'Concluído' ? ' fim' : '')}><time>{fmtData(t.data)}</time><div>{t.acao || t.status}</div></div>
          ))}
          {!c.timeline?.length && <span className="muted">Nenhum evento registrado.</span>}
        </div>
      </Card>
    </div>
  );
}
