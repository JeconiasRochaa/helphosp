import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection } from 'firebase/firestore';
import {
  LayoutDashboard, Ticket, Clock, CheckCircle2, AlertTriangle, Siren, CalendarClock, ShieldCheck, Timer,
  PieChart, Layers, Building2, TrendingUp, ListChecks, Monitor, Laptop, Printer, Package, Gauge, Inbox, ExternalLink
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { useChamados } from '@/context/ChamadosContext';
import { useCollection } from '@/hooks/useFirestore';
import { slaEstado } from '@/lib/sla';
import { fmtData, fmtRelativo, nomeDepartamento } from '@/lib/format';
import { Card, EmptyState, PageHeader, PrioridadeBadge, SearchInput, Skeleton, StatCard, StatusBadge, Tabs, SlaBadge } from '@/components/ui';
import { useChartTheme, coresStatus, coresPrioridade, sequencia } from './dashboard/chartSetup';
import { GraficoCard, Rosca, Barras, Linhas } from './dashboard/Graficos';
import { useOrdenacao } from './dashboard/useOrdenacao';
import { abertura, conformidadeSla, dataConclusao, fmtHoras, pct, serieDiaria, tempoMedioMs, topN, inicioDoDia } from './dashboard/stats';
import { STATUS_LIST, PRIORIDADES } from '@/lib/constants';
import './dashboard/dashboard.css';

const GETTERS = {
  protocolo: (c) => c.protocolo || '',
  data: (c) => abertura(c).getTime(),
  titulo: (c) => c.titulo || '',
  solicitante: (c) => c.solicitante || '',
  setor: (c) => c.setor || '',
  prioridade: (c) => PRIORIDADES.indexOf(c.prioridade),
  status: (c) => STATUS_LIST.indexOf(c.status),
  tecnico: (c) => c.tecnico || ''
};

const num = (v) => parseInt(v, 10) || 0;
const tom = (p) => (p == null ? 'gray' : p >= 90 ? 'green' : p >= 70 ? 'amber' : 'red');
const corTom = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)', gray: 'var(--muted)' };

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando dashboard">
      <div className="db-skel-grid">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={76} style={{ borderRadius: 12 }} />)}</div>
      <div className="db-grid">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={320} style={{ borderRadius: 12 }} />)}</div>
    </div>
  );
}

function ItemChamado({ c, icone: Icone, tone, extra, direita }) {
  return (
    <Link to={`/admin/chamados/${c.id}`} className="db-item">
      <div className="db-ico" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone}-fg)` }}><Icone size={17} /></div>
      <div className="db-body">
        <strong>{c.titulo || 'Sem título'}</strong>
        <span>{c.protocolo ? `${c.protocolo} · ` : ''}{c.setor || '—'} · {extra}</span>
      </div>
      {direita}
    </Link>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const { perms } = useAuth();
  const { sla } = useConfig();
  const { tickets, loading } = useChamados();
  const tema = useChartTheme();
  const [dias, setDias] = useState('14');
  const [busca, setBusca] = useState('');

  const verInventario = perms.podeFerramentasTI;   // só o painel de TI
  const inv = useCollection(() => (verInventario ? collection(db, 'inventario') : null), [verInventario]);
  const est = useCollection(() => (verInventario ? collection(db, 'estoque') : null), [verInventario]);

  const s = useMemo(() => {
    const agora = Date.now();
    const abertos = tickets.filter((c) => c.status !== 'Concluído');
    const concluidos = tickets.filter((c) => c.status === 'Concluído');
    const estados = { ok: 0, warning: 0, critical: 0 };
    abertos.forEach((c) => { const e = slaEstado(c, sla); if (estados[e] != null) estados[e]++; });
    const hoje = inicioDoDia().getTime();
    const hojeLista = tickets.filter((c) => abertura(c).getTime() >= hoje);
    const criticos = abertos.filter((c) => c.prioridade === 'Crítica').sort((a, b) => abertura(a) - abertura(b));
    const ultimos = concluidos.slice().sort((a, b) => (dataConclusao(b)?.getTime() || 0) - (dataConclusao(a)?.getTime() || 0)).slice(0, 8);
    return {
      total: tickets.length, abertos, concluidos, estados, criticos, ultimos,
      hoje: hojeLista.length, resolvidosHoje: hojeLista.filter((c) => c.status === 'Concluído').length,
      taxa: pct(concluidos.length, tickets.length),
      conformidade: conformidadeSla(tickets, sla, agora),
      tempoMedio: tempoMedioMs(concluidos),
      porStatus: STATUS_LIST.map((st) => tickets.filter((c) => c.status === st).length),
      porPrioridade: PRIORIDADES.map((p) => tickets.filter((c) => c.prioridade === p).length),
      setores: topN(tickets, (c) => c.setor || 'Outros', 6)
    };
  }, [tickets, sla]);

  const serie = useMemo(() => serieDiaria(tickets, Number(dias)), [tickets, dias]);

  const inventario = useMemo(() => {
    const itens = inv.data || [];
    const comp = itens.reduce((a, i) => a + num(i.computadores), 0);
    const imp = itens.reduce((a, i) => a + num(i.impressoras), 0);
    const total = itens.reduce((a, i) => a + num(i.computadores) + num(i.impressoras) + num(i.ramais) + num(i.tvs) + num(i.redes) + num(i.outros), 0);
    const estoque = (est.data || []).reduce((a, e) => a + num(e.quantidade), 0);
    return { comp, imp, total, estoque };
  }, [inv.data, est.data]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = tickets.slice(0, 200);
    if (!q) return base;
    return base.filter((c) => [c.protocolo, c.titulo, c.solicitante, c.setor, c.tecnico, c.status, c.prioridade].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [tickets, busca]);
  const { linhas, th } = useOrdenacao(filtrados, GETTERS, { chave: 'data', dir: 'desc' });
  const recentes = linhas.slice(0, 15);

  const hojeTxt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const irPara = (f) => () => nav(f ? `/admin/chamados?f=${f}` : '/admin/chamados');
  const tomSla = tom(s.conformidade);
  const cStatus = coresStatus(tema), cPrio = coresPrioridade(tema), seq = sequencia(tema);

  return (
    <>
      <PageHeader title="Dashboard" icon={LayoutDashboard} subtitle={`${nomeDepartamento(perms.dep)} • ${hojeTxt}`} />
      {loading ? <DashboardSkeleton /> : (
        <>
          <div className="db-stats">
            <StatCard icon={Ticket} label="Total de chamados" value={s.total} tone="blue" onClick={irPara()} hint="Ver todos" />
            <StatCard icon={Clock} label="Em aberto" value={s.abertos.length} tone="amber" onClick={irPara('abertos')} hint={`${s.hoje} aberto(s) hoje`} />
            <StatCard icon={AlertTriangle} label="Atrasados" value={s.estados.critical} tone="red" onClick={irPara('atrasados')} hint="SLA estourado" />
            <StatCard icon={CheckCircle2} label="Concluídos" value={s.concluidos.length} tone="green" onClick={irPara('concluidos')} hint={`${s.taxa}% de resolução`} />
            <StatCard icon={Siren} label="Críticos pendentes" value={s.criticos.length} tone="red" onClick={irPara('abertos')} />
            <StatCard icon={CalendarClock} label="Chamados hoje" value={s.hoje} tone="purple" hint={`${s.resolvidosHoje} resolvido(s)`} />
            <StatCard icon={ShieldCheck} label="Conformidade SLA" value={s.conformidade == null ? '—' : `${s.conformidade}%`} tone={tomSla === 'gray' ? 'blue' : tomSla} />
            <StatCard icon={Timer} label="Tempo médio" value={fmtHoras(s.tempoMedio)} tone="blue" hint="de atendimento" />
          </div>

          {verInventario && !inv.error && (
            <div className="db-stats">
              <StatCard icon={Monitor} label="Total de equipamentos" value={inventario.total} tone="purple" onClick={() => nav('/admin/inventario')} />
              <StatCard icon={Laptop} label="Computadores" value={inventario.comp} tone="blue" />
              <StatCard icon={Printer} label="Impressoras" value={inventario.imp} tone="green" />
              <StatCard icon={Package} label="Itens em estoque" value={inventario.estoque} tone="amber" onClick={() => nav('/admin/estoque')} />
            </div>
          )}

          <div className="db-grid db-wide">
            <Card title="Tendência de chamados" icon={TrendingUp}
              actions={<Tabs tabs={[{ id: '7', label: '7 dias' }, { id: '14', label: '14 dias' }, { id: '30', label: '30 dias' }]} value={dias} onChange={setDias} />}>
              <div className="db-chart">
                <Linhas labels={serie.map((d) => d.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))}
                  series={[{ label: 'Abertos', data: serie.map((d) => d.abertos), cor: tema.blue }, { label: 'Concluídos', data: serie.map((d) => d.concluidos), cor: tema.green }]} />
              </div>
            </Card>
            <Card title="Conformidade de SLA" icon={Gauge}>
              <div className="db-gauge">
                <div className="valor" style={{ color: corTom[tomSla] }}>{s.conformidade == null ? '—' : `${s.conformidade}%`}</div>
                <div className="rotulo">dos chamados dentro do prazo</div>
              </div>
              <div className="db-bar" style={{ margin: '12px 0 4px' }}><div className={`c-${tomSla === 'green' ? 'ok' : tomSla === 'amber' ? 'warning' : 'critical'}`} style={{ width: `${s.conformidade || 0}%` }} /></div>
              <div className="db-meta"><span>Meta: 90%</span><span>Tempo médio: <strong>{fmtHoras(s.tempoMedio)}</strong></span></div>
              <div className="grid-3" style={{ marginTop: 16, gap: 8 }}>
                {[['No prazo', s.estados.ok, 'green'], ['Próximos', s.estados.warning, 'amber'], ['Atrasados', s.estados.critical, 'red']].map(([l, v, t]) => (
                  <Link key={l} to="/admin/sla" style={{ textDecoration: 'none', textAlign: 'center', padding: '10px 4px', borderRadius: 10, background: `var(--${t}-bg)`, color: `var(--${t}-fg)` }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div><div className="text-xs">{l}</div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          <div className="db-grid db-3">
            <GraficoCard title="Por status" icon={PieChart} vazio={!s.total} small>
              <Rosca labels={STATUS_LIST} data={s.porStatus} cores={STATUS_LIST.map((x) => cStatus[x])} />
            </GraficoCard>
            <GraficoCard title="Por prioridade" icon={Layers} vazio={!s.total} small>
              <Rosca labels={PRIORIDADES} data={s.porPrioridade} cores={PRIORIDADES.map((x) => cPrio[x])} />
            </GraficoCard>
            <GraficoCard title="Setores com mais chamados" icon={Building2} vazio={!s.setores.length} small>
              <Barras horizontal labels={s.setores.map((x) => x[0])} data={s.setores.map((x) => x[1])} cores={seq} />
            </GraficoCard>
          </div>

          <div className="db-grid">
            <Card title={`Críticos pendentes (${s.criticos.length})`} icon={Siren}>
              {!s.criticos.length ? <EmptyState icon={CheckCircle2} title="Tudo sob controle">Nenhum chamado crítico pendente.</EmptyState> : (
                <div className="db-scroll">
                  {s.criticos.map((c) => (
                    <ItemChamado key={c.id} c={c} icone={AlertTriangle} tone="red" extra={`aberto ${fmtRelativo(c.data_abertura)} atrás`} direita={<SlaBadge chamado={c} overrides={sla} />} />
                  ))}
                </div>
              )}
            </Card>
            <Card title="Últimos serviços concluídos" icon={ListChecks}>
              {!s.ultimos.length ? <EmptyState icon={Inbox} title="Nenhum serviço concluído" /> : (
                <div className="db-scroll">
                  {s.ultimos.map((c) => (
                    <ItemChamado key={c.id} c={c} icone={CheckCircle2} tone="green" extra={`${c.tecnico || 'sem técnico'} · ${fmtData(dataConclusao(c))}`} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Chamados recentes" icon={Ticket}
            actions={<><div style={{ width: 240 }}><SearchInput value={busca} onChange={setBusca} placeholder="Buscar chamado..." /></div>
              <Link to="/admin/chamados" className="btn btn-outline btn-sm"><ExternalLink size={13} />Ver todos</Link></>}>
            {!recentes.length ? <EmptyState icon={Inbox} title="Nenhum chamado encontrado" /> : (
              <div className="table-card">
                <table className="db-table">
                  <thead><tr>{th('protocolo', 'Protocolo')}{th('data', 'Data')}{th('titulo', 'Título')}{th('solicitante', 'Solicitante')}{th('setor', 'Setor')}{th('prioridade', 'Prioridade')}{th('status', 'Status')}{th('tecnico', 'Técnico')}</tr></thead>
                  <tbody>
                    {recentes.map((c) => (
                      <tr key={c.id} className="clicavel" onClick={() => nav(`/admin/chamados/${c.id}`)}>
                        <td><Link to={`/admin/chamados/${c.id}`} onClick={(e) => e.stopPropagation()}><strong>{c.protocolo || '—'}</strong></Link></td>
                        <td className="nowrap">{fmtData(c.data_abertura)}</td>
                        <td className="tit" title={c.titulo}>{c.titulo || '—'}</td>
                        <td>{c.solicitante || '—'}</td>
                        <td>{c.setor || '—'}</td>
                        <td><PrioridadeBadge prioridade={c.prioridade} /></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>{c.tecnico || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
