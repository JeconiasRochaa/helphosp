import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Camera, Clock, FastForward, HardHat, History, MessageSquare, MessageCircle, RotateCcw, Trash2, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useChamados } from '@/context/ChamadosContext';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import Comentarios from '@/components/Comentarios';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, PhotoGallery, PhotoPicker, PrioridadeBadge, SlaBadge, Spinner, StatusBadge, Tabs } from '@/components/ui';
import { FOTO_MAX_EQUIPE, PRIORIDADES, STATUS_FLUXO } from '@/lib/constants';
import SeletorExecutores from '@/components/SeletorExecutores';
import { anexarFotosEquipe, assumirChamado, avancarStatus, definirExecutante, definirPrioridade, excluirChamado, reabrirChamado } from '@/lib/chamadosApi';
import { fmtData, fmtDuracao, linkWhatsApp, nomeDepartamento } from '@/lib/format';
import { slaPrazo, slaRestanteMs } from '@/lib/sla';
import { notify } from '@/lib/notify';

export default function ChamadoDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chamados, loading } = useChamados();
  const { sla } = useConfig();
  const { perfil, perms } = useAuth();
  const [aba, setAba] = useState('conversa');
  const [fotoModal, setFotoModal] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const c = chamados.find((x) => x.id === id);
  if (loading) return <Spinner label="Carregando chamado…" />;
  if (!c) return <div className="card"><EmptyState title="Chamado não encontrado" action={<Link className="btn btn-primary" to="/admin/chamados">Voltar à lista</Link>}>Ele pode ter sido excluído ou pertencer a outro departamento.</EmptyState></div>;
  if (c.tipo === 'gesthosp') return <Navigate to="/admin/gesthosp" replace />;

  const concl = c.status === 'Concluído';
  const dono = c.tecnico;
  const bloqueado = !!dono && dono !== perfil.nome && !perms.isAdmin;
  const proximo = STATUS_FLUXO[c.status];
  const zap = linkWhatsApp(c.contato, `Olá ${c.solicitante}, aqui é ${perfil.nome} (${nomeDepartamento(c.departamento)}) sobre o chamado ${c.protocolo}.`);
  const restante = slaRestanteMs(c, sla); const prazo = slaPrazo(c.prioridade, sla);
  const pct = Math.min(100, Math.max(0, ((prazo - restante) / prazo) * 100));

  const run = async (fn, ok) => { try { await fn(); if (ok) notify.success(ok, { som: false }); } catch (e) { console.error(e); notify.error('A operação falhou. Tente novamente.'); } };
  async function avancar() {
    const r = await avancarStatus(c, perfil, perms).catch((e) => { console.error(e); return { ok: false, motivo: 'Erro ao atualizar.' }; });
    if (!r.ok) notify.warning(r.motivo); else notify.success(`Status: ${r.status}`, { som: r.status === 'Concluído' ? 'concluido' : false });
  }
  async function reabrir() {
    const motivo = await notify.prompt('Informe o motivo da reabertura (fica registrado no histórico).', { titulo: 'Reabrir chamado', variante: 'warning', obrigatorio: false });
    if (motivo === null) return; run(() => reabrirChamado(c, perfil, motivo), 'Chamado reaberto.');
  }
  async function excluir() {
    if (!(await notify.confirm('Este chamado, seu histórico e comentários deixarão de ser exibidos. Esta ação não pode ser desfeita.', { titulo: 'Excluir chamado', confirmar: 'Excluir' }))) return;
    try { await excluirChamado(c); notify.success('Chamado excluído.'); nav('/admin/chamados'); } catch { notify.error('Não foi possível excluir.'); }
  }

  return (
    <>
      <PageHeader crumbs={[{ label: 'Chamados', to: '/admin/chamados' }, { label: c.protocolo }]} title={c.titulo || 'Sem título'}
        subtitle={<span className="row-wrap" style={{ gap: 8 }}><span className="mono">{c.protocolo}</span><StatusBadge status={c.status} /><PrioridadeBadge prioridade={c.prioridade} /><span>Aberto em {fmtData(c.data_abertura)}</span></span>} />
      <div className="detalhe-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 18, alignItems: 'start' }}>
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <Card title="Informações">
            <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
              {[['Solicitante', c.solicitante], ['Contato', c.contato], ['Setor', c.setor], ['Departamento', nomeDepartamento(c.departamento)], ['Categoria', c.categoria], ['Técnico', c.tecnico || 'Ainda não atribuído'], c.executante && ['Executante', c.executante], ['Origem', c.origem === 'portal' ? 'Portal (aparelho do solicitante)' : 'Painel']].filter(Boolean).map(([k, v]) => <div key={k}><div className="label">{k}</div><strong>{v || '—'}</strong></div>)}
            </div>
            {c.descricao && <><div className="divider" /><div className="label">Descrição</div><p style={{ whiteSpace: 'pre-wrap' }}>{c.descricao}</p></>}
          </Card>
          {(c.fotos?.length > 0 || c.fotos_equipe?.length > 0) && (
            <Card title="Fotos" icon={Camera}><div className="stack" style={{ gap: 16 }}>
              <PhotoGallery urls={c.fotos} titulo="Enviadas pelo solicitante" /><PhotoGallery urls={c.fotos_equipe} titulo="Anexadas pela equipe técnica" />
            </div></Card>
          )}
          <Card>
            <Tabs value={aba} onChange={setAba} tabs={[{ id: 'conversa', label: 'Conversa', icon: MessageSquare, count: c.qtd_comentarios_publicos || undefined }, { id: 'historico', label: 'Histórico', icon: History, count: c.timeline?.length }]} />
            <div style={{ marginTop: 16 }}>
              {aba === 'conversa' ? <Comentarios chamado={c} modo="equipe" /> : (
                <div className="timeline">{(c.timeline || []).slice().reverse().map((t, i) => <div key={i} className={'tl-item' + (t.status === 'Concluído' ? ' fim' : '')}><time>{fmtData(t.data)}</time><div>{t.acao || t.status}</div></div>)}</div>
              )}
            </div>
          </Card>
        </div>

        <div className="stack" style={{ gap: 16, position: 'sticky', top: 78 }}>
          <Card title="SLA" icon={Clock}>
            <div className="row" style={{ justifyContent: 'space-between' }}><SlaBadge chamado={c} overrides={sla} />{!concl && <strong className={restante < 0 ? '' : ''} style={{ color: restante < 0 ? 'var(--danger)' : undefined }}>{restante < 0 ? 'Estourou há ' : 'Restam '}{fmtDuracao(Math.abs(restante))}</strong>}</div>
            {!concl && <div className="progress" style={{ marginTop: 10 }}><div style={{ width: pct + '%', background: pct > 100 || restante < 0 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : undefined }} /></div>}
            <div className="text-xs muted" style={{ marginTop: 6 }}>Meta para prioridade {c.prioridade}: {fmtDuracao(prazo)}</div>
          </Card>
          <Card title="Ações">
            <div className="stack" style={{ gap: 8 }}>
              {concl ? (perms.isAdmin ? <Button variant="outline" icon={RotateCcw} onClick={reabrir} block>Reabrir chamado</Button> : <Badge tone="green">Chamado concluído</Badge>)
                : bloqueado ? <Badge tone="amber">Em atendimento por {dono}</Badge>
                  : <Button icon={FastForward} onClick={avancar} block>{c.status === 'A Fazer' ? 'Iniciar atendimento' : `Avançar para “${proximo}”`}</Button>}
              {!concl && !dono && <Button variant="outline" icon={UserCheck} onClick={() => run(() => assumirChamado(c, perfil), 'Você assumiu o chamado.')} block>Assumir chamado</Button>}
              {!concl && <Button variant="outline" icon={Camera} onClick={() => setFotoModal(true)} block>Adicionar fotos</Button>}
              {!concl && perms.isManut && <Executante c={c} perfil={perfil} />}
              {zap && <a className="btn btn-outline btn-block" href={zap} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />Chamar no WhatsApp</a>}
              {!concl && !bloqueado && <label className="field-hint" style={{ display: 'grid', gap: 4 }}>Alterar prioridade
                <select className="select" value={c.prioridade} onChange={(e) => run(() => definirPrioridade(c, e.target.value, perfil), 'Prioridade atualizada.')}>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select></label>}
              {perms.podeExcluir && <Button variant="danger" icon={Trash2} onClick={excluir} block>Excluir chamado</Button>}
            </div>
          </Card>
        </div>
      </div>
      <style>{`@media (max-width: 1000px){ .detalhe-grid{ grid-template-columns: 1fr !important; } .detalhe-grid > div:last-child{ position: static !important; order:-1; } }`}</style>
      {fotoModal && <FotosModal c={c} perfil={perfil} onClose={() => setFotoModal(false)} />}
    </>
  );
}

function Executante({ c, perfil }) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const { perms } = useAuth();
  const abrir = () => { setSel(c.executantes?.length ? c.executantes : (c.executante ? String(c.executante).split(',').map((n) => ({ id: 'n-' + n.trim(), nome: n.trim() })) : [])); setAberto(true); };
  async function salvar() { setBusy(true); try { await definirExecutante(c, sel, perfil); notify.success('Executantes definidos.', { som: false }); setAberto(false); } catch { notify.error('Não foi possível salvar.'); setBusy(false); } }
  return (
    <>
      <Button variant="outline" icon={HardHat} onClick={abrir} block>{c.executante ? `Executante: ${c.executante}` : 'Atribuir executante'}</Button>
      {aberto && <Modal title="Quem vai executar o serviço" icon={HardHat} onClose={() => setAberto(false)} width={520}
        footer={<><Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar</Button></>}>
        <p className="muted text-sm" style={{ marginTop: 0 }}>Selecione um ou mais profissionais. Quem está na escala de hoje aparece primeiro.</p>
        <SeletorExecutores dep={perms.dep} value={sel} onChange={setSel} />
      </Modal>}
    </>
  );
}

function FotosModal({ c, perfil, onClose }) {
  const [fotos, setFotos] = useState([]); const [p, setP] = useState(0); const [busy, setBusy] = useState(false);
  const enviar = async () => {
    setBusy(true);
    try { const u = await anexarFotosEquipe(c, fotos, perfil, setP); notify.success(`${u.length} foto(s) anexada(s).`); onClose(); }
    catch (e) { console.error(e); notify.error('Erro ao enviar as fotos.'); setBusy(false); }
  };
  return (
    <Modal title="Adicionar fotos ao atendimento" icon={Camera} onClose={onClose} width={520}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!fotos.length} onClick={enviar}>Enviar {fotos.length || ''}</Button></>}>
      <PhotoPicker value={fotos} onChange={setFotos} max={FOTO_MAX_EQUIPE} />
      {busy && <div className="progress" style={{ marginTop: 12 }}><div style={{ width: p + '%' }} /></div>}
    </Modal>
  );
}
export { useMemo };
