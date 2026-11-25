import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Download, FastForward, MessageSquare, Plus, Send, Ticket } from 'lucide-react';
import { useChamados } from '@/context/ChamadosContext';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import { Button, EmptyState, Field, Modal, PageHeader, PhotoPicker, PrioridadeBadge, SearchInput, SlaBadge, Spinner, StatusBadge, Tabs } from '@/components/ui';
import { avancarStatus, criarChamadoEquipe } from '@/lib/chamadosApi';
import { CATEGORIAS_PADRAO, FOTO_MAX_EQUIPE, PRIORIDADE_POR_CATEGORIA, PRIORIDADES, STATUS_LIST } from '@/lib/constants';
import { baixarArquivo, fmtData, fmtRelativo, linkWhatsApp, paraCSV, toDate } from '@/lib/format';
import { slaEstado } from '@/lib/sla';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';

const ABAS = { '': 'todos', abertos: 'abertos', atrasados: 'atrasados', concluidos: 'concluidos' };

export default function Chamados() {
  const { tickets, loading } = useChamados();
  const { sla, setores } = useConfig();
  const { perfil, perms } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const f = sp.get('f') || '';
  const [busca, setBusca] = useState(''); const [status, setStatus] = useState(''); const [prio, setPrio] = useState(''); const [setor, setSetor] = useState('');
  const [novo, setNovo] = useState(false);

  const contagem = useMemo(() => ({
    todos: tickets.length,
    abertos: tickets.filter((c) => c.status !== 'Concluído').length,
    atrasados: tickets.filter((c) => slaEstado(c, sla) === 'critical').length,
    concluidos: tickets.filter((c) => c.status === 'Concluído').length
  }), [tickets, sla]);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return tickets.filter((c) => {
      if (f === 'abertos' && c.status === 'Concluído') return false;
      if (f === 'concluidos' && c.status !== 'Concluído') return false;
      if (f === 'atrasados' && slaEstado(c, sla) !== 'critical') return false;
      if (status && c.status !== status) return false;
      if (prio && c.prioridade !== prio) return false;
      if (setor && c.setor !== setor) return false;
      if (t && ![c.titulo, c.protocolo, c.solicitante, c.setor, c.tecnico].some((v) => String(v || '').toLowerCase().includes(t))) return false;
      return true;
    });
  }, [tickets, f, status, prio, setor, busca, sla]);

  async function avancar(e, c) {
    e.stopPropagation();
    try {
      const r = await avancarStatus(c, perfil, perms);
      if (!r.ok) notify.warning(r.motivo, { titulo: 'Não foi possível avançar' });
      else notify.success(`Status atualizado: ${r.status}`, { som: r.status === 'Concluído' ? 'concluido' : false });
    } catch (err) { console.error(err); notify.error('Erro ao atualizar o status.'); }
  }
  function exportar() {
    baixarArquivo(`chamados-${new Date().toISOString().slice(0, 10)}.csv`, paraCSV(lista, [
      { titulo: 'Protocolo', valor: 'protocolo' }, { titulo: 'Abertura', valor: (c) => fmtData(c.data_abertura) }, { titulo: 'Título', valor: 'titulo' },
      { titulo: 'Solicitante', valor: 'solicitante' }, { titulo: 'Setor', valor: 'setor' }, { titulo: 'Categoria', valor: 'categoria' },
      { titulo: 'Prioridade', valor: 'prioridade' }, { titulo: 'Status', valor: 'status' }, { titulo: 'Técnico', valor: 'tecnico' }]), 'text/csv;charset=utf-8');
    audit('chamado.exportar_csv', { qtd: lista.length });
  }

  return (
    <>
      <PageHeader icon={Ticket} title="Chamados" subtitle={`${lista.length} de ${tickets.length} chamado(s)`}
        actions={<><Button variant="outline" size="sm" icon={Download} onClick={exportar} disabled={!lista.length}>Exportar CSV</Button><Button size="sm" icon={Plus} onClick={() => setNovo(true)}>Novo chamado</Button></>} />
      <div style={{ marginBottom: 14 }}>
        <Tabs value={ABAS[f] || 'todos'} onChange={(id) => (id === 'todos' ? setSp({}) : setSp({ f: id }))}
          tabs={[{ id: 'todos', label: 'Todos', count: contagem.todos }, { id: 'abertos', label: 'Em aberto', count: contagem.abertos }, { id: 'atrasados', label: 'Atrasados', count: contagem.atrasados }, { id: 'concluidos', label: 'Concluídos', count: contagem.concluidos }]} />
      </div>
      <div className="filtros">
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por título, protocolo, solicitante, setor…" />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{STATUS_LIST.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select" value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">Todas as prioridades</option>{PRIORIDADES.map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select" value={setor} onChange={(e) => setSetor(e.target.value)}><option value="">Todos os setores</option>{setores.map((s) => <option key={s}>{s}</option>)}</select>
      </div>
      {loading ? <Spinner label="Carregando chamados…" /> : lista.length === 0 ? <div className="card"><EmptyState title="Nenhum chamado encontrado">Ajuste os filtros ou abra um novo chamado.</EmptyState></div> : (
        <div className="table-card"><table>
          <thead><tr><th>Protocolo</th><th>Chamado</th><th>Setor</th><th>Prioridade</th><th>Status</th><th>SLA</th><th>Técnico</th><th /></tr></thead>
          <tbody>{lista.map((c) => {
            const zap = linkWhatsApp(c.contato);
            return (
              <tr key={c.id} className="clicavel" onClick={() => nav(`/admin/chamados/${c.id}`)}>
                <td className="mono nowrap"><strong>{c.protocolo || '—'}</strong><div className="text-xs muted">{fmtRelativo(c.data_abertura)}</div></td>
                <td style={{ maxWidth: 320 }}><div className="row" style={{ gap: 8 }}>
                  {c.fotos?.[0] && <img src={c.fotos[0]} alt="" loading="lazy" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />}
                  <div style={{ minWidth: 0 }}><strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titulo || '—'}</strong>
                    <span className="text-xs muted">{c.solicitante}{zap && ' · WhatsApp'}
                      {c.fotos?.length > 0 && <> · <Camera size={11} style={{ verticalAlign: -1 }} />{c.fotos.length + (c.fotos_equipe?.length || 0)}</>}
                      {c.qtd_comentarios_publicos > 0 && <> · <MessageSquare size={11} style={{ verticalAlign: -1 }} />{c.qtd_comentarios_publicos}</>}</span></div></div></td>
                <td>{c.setor || '—'}</td><td><PrioridadeBadge prioridade={c.prioridade} /></td><td><StatusBadge status={c.status} /></td>
                <td><SlaBadge chamado={c} overrides={sla} /></td><td className="text-sm">{c.tecnico || <span className="muted">—</span>}</td>
                <td>{c.status !== 'Concluído' && <Button size="sm" variant="outline" icon={FastForward} title="Avançar status" onClick={(e) => avancar(e, c)} />}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      {novo && <NovoChamado onClose={() => setNovo(false)} />}
    </>
  );
}

function NovoChamado({ onClose }) {
  const { perfil, perms } = useAuth();
  const { setores } = useConfig();
  const nav = useNavigate();
  const [f, setF] = useState({ solicitante: '', contato: '', setor: '', categoria: '', titulo: '', descricao: '', prioridade: 'Média' });
  const [fotos, setFotos] = useState([]); const [busy, setBusy] = useState(false); const [er, setEr] = useState({});
  const cats = CATEGORIAS_PADRAO[perms.dep] || [];
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function criar(e) {
    e.preventDefault();
    const x = {}; ['solicitante', 'setor', 'categoria', 'titulo'].forEach((k) => { if (!f[k].trim()) x[k] = 'Obrigatório.'; });
    setEr(x); if (Object.keys(x).length) return;
    setBusy(true);
    try { const r = await criarChamadoEquipe({ ...f, departamento: perms.dep }, perfil, fotos); notify.success(`Protocolo ${r.protocolo}`, { titulo: 'Chamado criado' }); onClose(); nav(`/admin/chamados/${r.id}`); }
    catch (err) { console.error(err); notify.error('Erro ao criar o chamado.'); setBusy(false); }
  }
  return (
    <Modal title="Novo chamado" icon={Plus} onClose={onClose} width={680}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button icon={Send} loading={busy} onClick={criar}>Criar chamado</Button></>}>
      <form className="stack" onSubmit={criar} noValidate>
        <div className="form-row"><Field label="Solicitante" required error={er.solicitante}><input className="input" value={f.solicitante} onChange={set('solicitante')} /></Field><Field label="Contato"><input className="input" value={f.contato} onChange={set('contato')} placeholder="WhatsApp / ramal" /></Field></div>
        <div className="form-row"><Field label="Setor" required error={er.setor}><select className="select" value={f.setor} onChange={set('setor')}><option value="">Selecione…</option>{setores.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Categoria" required error={er.categoria}><select className="select" value={f.categoria} onChange={(e) => setF((s) => ({ ...s, categoria: e.target.value, prioridade: PRIORIDADE_POR_CATEGORIA[e.target.value] || s.prioridade }))}><option value="">Selecione…</option>{cats.map((s) => <option key={s}>{s}</option>)}</select></Field></div>
        <div className="form-row"><Field label="Prioridade"><select className="select" value={f.prioridade} onChange={set('prioridade')}>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="Técnico responsável"><input className="input" value={perfil.nome} readOnly /></Field></div>
        <Field label="Título" required error={er.titulo}><input className="input" value={f.titulo} onChange={set('titulo')} /></Field>
        <Field label="Descrição"><textarea className="textarea" rows={3} value={f.descricao} onChange={set('descricao')} /></Field>
        <Field label="Fotos"><PhotoPicker value={fotos} onChange={setFotos} max={FOTO_MAX_EQUIPE} /></Field>
      </form>
    </Modal>
  );
}
