import { useMemo, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, UserCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Button, Card, EmptyState, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import { TURNOS, daISO, isoDia, isoMes, turnoDe, useEscalaMes, usePessoas } from '@/lib/escala';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export default function Escala() {
  const { perms } = useAuth();
  const [ref, setRef] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [sel, setSel] = useState(isoDia());
  const [novo, setNovo] = useState(null);
  const mes = isoMes(ref);
  const { data: itens, loading } = useEscalaMes(perms.dep, mes);
  const { data: profs } = usePessoas(perms.dep);
  const hoje = isoDia();
  const hojeMes = isoMes();
  const { data: itensHoje } = useEscalaMes(perms.dep, hojeMes);

  const porDia = useMemo(() => { const m = {}; itens.forEach((i) => { (m[i.data] ||= []).push(i); }); Object.values(m).forEach((a) => a.sort((x, y) => TURNOS.findIndex((t) => t.id === x.turno) - TURNOS.findIndex((t) => t.id === y.turno) || String(x.nome).localeCompare(String(y.nome)))); return m; }, [itens]);
  const dosHoje = useMemo(() => itensHoje.filter((i) => i.data === hoje).sort((a, b) => TURNOS.findIndex((t) => t.id === a.turno) - TURNOS.findIndex((t) => t.id === b.turno)), [itensHoje, hoje]);

  const celulas = useMemo(() => {
    const ano = ref.getFullYear(), m = ref.getMonth(); const ini = new Date(ano, m, 1).getDay(); const total = new Date(ano, m + 1, 0).getDate();
    return [...Array(ini).fill(null), ...Array.from({ length: total }, (_, i) => isoDia(new Date(ano, m, i + 1)))];
  }, [ref]);
  const mover = (d) => setRef((r) => new Date(r.getFullYear(), r.getMonth() + d, 1));
  const doDia = porDia[sel] || [];

  async function remover(i) {
    if (!(await notify.confirm(`Remover ${i.nome} (${i.turno}) do dia ${daISO(i.data).toLocaleDateString('pt-BR')}?`, { titulo: 'Remover da escala', confirmar: 'Remover' }))) return;
    try { const b = writeBatch(db); b.delete(doc(db, 'escala', i.id)); await b.commit(); audit('escala.remover', { nome: i.nome, data: i.data }); } catch { notify.error('Sem permissão para remover.'); }
  }

  return (
    <>
      <PageHeader icon={CalendarDays} title="Escala" subtitle="Quem está de serviço em cada dia" actions={<Button icon={Plus} onClick={() => setNovo({ data: sel })}>Adicionar à escala</Button>} />
      <Card title="Hoje na escala" icon={UserCheck} subtitle={daISO(hoje).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}>
        {dosHoje.length === 0 ? <span className="muted">Ninguém escalado para hoje.</span> : (
          <div className="escala-hoje">{dosHoje.map((i) => (<div key={i.id} className="esc-pessoa"><Avatar nome={i.nome} /><div><strong>{i.nome}</strong><small>{i.funcao || 'Profissional'}</small></div><span className="esc-turno" style={{ '--c': turnoDe(i.turno).cor }}>{i.turno}</span></div>))}</div>
        )}
      </Card>
      <div className="escala-layout">
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ marginBottom: 10 }}>
            <Button size="sm" variant="outline" icon={ChevronLeft} onClick={() => mover(-1)} aria-label="Mês anterior" />
            <strong className="cap1" style={{ fontSize: 17, flex: 1, textAlign: 'center' }}>{MESES[ref.getMonth()]} de {ref.getFullYear()}</strong>
            <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(1); setRef(d); setSel(hoje); }}>Hoje</Button>
            <Button size="sm" variant="outline" icon={ChevronRight} onClick={() => mover(1)} aria-label="Próximo mês" />
          </div>
          {loading ? <Spinner /> : (
            <div className="cal">
              {DIAS.map((d) => <div key={d} className="cal-h">{d}</div>)}
              {celulas.map((iso, i) => iso ? (
                <button key={iso} type="button" className={'cal-d' + (iso === hoje ? ' hoje' : '') + (iso === sel ? ' sel' : '')} onClick={() => setSel(iso)}>
                  <span className="n">{Number(iso.slice(8))}</span>
                  <span className="chips">{(porDia[iso] || []).slice(0, 3).map((x) => <i key={x.id} style={{ '--c': turnoDe(x.turno).cor }}>{String(x.nome).split(' ')[0]}</i>)}{(porDia[iso] || []).length > 3 && <em>+{porDia[iso].length - 3}</em>}</span>
                </button>
              ) : <div key={'v' + i} />)}
            </div>
          )}
          <div className="row-wrap" style={{ marginTop: 10 }}>{TURNOS.map((t) => <span key={t.id} className="esc-turno" style={{ '--c': t.cor }}>{t.id} · {t.h}</span>)}</div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="row"><h4 className="cap1" style={{ margin: 0, flex: 1 }}>{daISO(sel).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h4><Button size="sm" icon={Plus} onClick={() => setNovo({ data: sel })}>Adicionar</Button></div>
          <div className="stack" style={{ gap: 8, marginTop: 12 }}>
            {doDia.length === 0 && <EmptyState icon={CalendarDays} title="Sem escala neste dia">Use "Adicionar" para escalar profissionais.</EmptyState>}
            {doDia.map((i) => (
              <div key={i.id} className="esc-pessoa"><Avatar nome={i.nome} /><div style={{ flex: 1, minWidth: 0 }}><strong>{i.nome}</strong><small>{i.funcao || 'Profissional'}{i.obs ? ` · ${i.obs}` : ''}</small></div><span className="esc-turno" style={{ '--c': turnoDe(i.turno).cor }}>{i.turno}</span><Button size="sm" variant="ghost" icon={Trash2} onClick={() => remover(i)} aria-label="Remover" /></div>
            ))}
          </div>
        </div>
      </div>
      {novo && <NovoModal inicial={novo} profs={profs} dep={perms.dep} onClose={() => setNovo(null)} />}
    </>
  );
}

function NovoModal({ inicial, profs, dep, onClose }) {
  const [ids, setIds] = useState([]); const [turno, setTurno] = useState('Dia todo'); const [obs, setObs] = useState('');
  const [de, setDe] = useState(inicial.data); const [ate, setAte] = useState(inicial.data);
  const [dias, setDias] = useState([0, 1, 2, 3, 4, 5, 6]); const [busy, setBusy] = useState(false);
  const alt = (id) => setIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const altDia = (d) => setDias((a) => (a.includes(d) ? a.filter((x) => x !== d) : [...a, d]));

  async function salvar() {
    if (!ids.length) return notify.warning('Selecione ao menos um profissional.');
    if (ate < de) return notify.warning('A data final é anterior à inicial.');
    const lista = []; for (let d = daISO(de); isoDia(d) <= ate; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) if (dias.includes(d.getDay())) lista.push(isoDia(d));
    if (!lista.length) return notify.warning('Nenhum dia selecionado no período.');
    if (lista.length * ids.length > 450) return notify.warning('Período muito grande. Divida em partes menores.');
    setBusy(true);
    try {
      const b = writeBatch(db);
      lista.forEach((data) => ids.forEach((pid) => { const p = profs.find((x) => x.id === pid); b.set(doc(collection(db, 'escala')), { departamento: dep, data, mes: data.slice(0, 7), profissionalId: pid, nome: p.nome, funcao: p.funcao || '', turno, obs: obs.trim() }); }));
      await b.commit(); audit('escala.adicionar', { dias: lista.length, profissionais: ids.length, turno });
      notify.success(`${lista.length * ids.length} lançamento(s) adicionado(s) à escala.`); onClose();
    } catch (e) { console.error(e); notify.error('Não foi possível salvar a escala.'); setBusy(false); }
  }
  return (
    <Modal title="Adicionar à escala" icon={CalendarDays} onClose={onClose} width={560} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar escala</Button></>}>
      <div className="stack" style={{ gap: 14 }}>
        {profs.length === 0 ? <EmptyState title="Cadastre profissionais primeiro">Vá em "Profissionais" para incluir a equipe de campo.</EmptyState> : (
          <Field label="Profissionais"><div className="chips-sel">{profs.map((p) => <button type="button" key={p.id} className={ids.includes(p.id) ? 'on' : ''} onClick={() => alt(p.id)}>{p.nome}<small>{p.funcao}</small></button>)}</div></Field>
        )}
        <div className="form-row">
          <Field label="Turno"><select className="select" value={turno} onChange={(e) => setTurno(e.target.value)}>{TURNOS.map((t) => <option key={t.id} value={t.id}>{t.id} ({t.h})</option>)}</select></Field>
          <Field label="Observação (opcional)"><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sobreaviso" /></Field>
        </div>
        <div className="form-row">
          <Field label="De"><input className="input" type="date" value={de} onChange={(e) => { setDe(e.target.value); if (ate < e.target.value) setAte(e.target.value); }} /></Field>
          <Field label="Até"><input className="input" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} /></Field>
        </div>
        <Field label="Repetir nos dias da semana"><div className="chips-sel dias">{DIAS.map((n, i) => <button type="button" key={n} className={dias.includes(i) ? 'on' : ''} onClick={() => altDia(i)}>{n}</button>)}</div></Field>
      </div>
    </Modal>
  );
}
