import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { ArrowLeft, Maximize, Mic, Volume2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { depVariantes, fmtDuracao, normalizarDepartamento, nomeDepartamento, toDate } from '@/lib/format';
import { slaEstado, slaRestanteMs } from '@/lib/sla';
import { notify } from '@/lib/notify';
import './tv/tv.css';

const PESO = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
const slug = (p) => String(p || 'Média').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const hora = (v) => toDate(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function PainelTV() {
  const { perms } = useAuth(); const { sla } = useConfig(); const [sp] = useSearchParams();
  const dep = perms.isAdmin ? normalizarDepartamento(sp.get('dep') || perms.dep || 'TI') : perms.dep;   // equipe só vê o próprio departamento
  const [agora, setAgora] = useState(new Date()); const [som, setSom] = useState(true); const [voz, setVoz] = useState(true);
  const { data, loading, error } = useCollection(() => query(collection(db, 'chamados'), where('departamento', 'in', depVariantes(dep))), [dep]);
  const conhecidos = useRef(null); const ultimoAtraso = useRef(0);

  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 1000); return () => clearInterval(t); }, []);
  const lista = useMemo(() => data.filter((c) => c.tipo !== 'gesthosp' && c.tipo !== 'toner' && !c.isToner), [data]);
  const inicioDia = useMemo(() => { const d = new Date(agora); d.setHours(0, 0, 0, 0); return d; }, [agora.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const atrasado = (c) => slaEstado(c, sla) === 'critical';
  const pend = useMemo(() => lista.filter((c) => c.status !== 'Concluído').sort((a, b) => (atrasado(a) ? 0 : 1) - (atrasado(b) ? 0 : 1) || (PESO[a.prioridade] ?? 2) - (PESO[b.prioridade] ?? 2) || toDate(a.data_abertura) - toDate(b.data_abertura)), [lista, sla, agora.getMinutes()]); // eslint-disable-line react-hooks/exhaustive-deps
  const conc = useMemo(() => lista.filter((c) => c.status === 'Concluído' && toDate(c.data_atualizacao || c.data_abertura) >= inicioDia).sort((a, b) => toDate(b.data_atualizacao || b.data_abertura) - toDate(a.data_atualizacao || a.data_abertura)), [lista, inicioDia]);
  const nAtr = pend.filter(atrasado).length;

  const falar = (t) => { if (!voz || !('speechSynthesis' in window)) return; try { const u = new SpeechSynthesisUtterance(t); u.lang = 'pt-BR'; speechSynthesis.speak(u); } catch { /* */ } };
  useEffect(() => { // novos chamados
    if (loading) return;
    const ids = new Set(pend.map((c) => c.id));
    if (conhecidos.current) {
      const novos = pend.filter((c) => !conhecidos.current.has(c.id));
      if (novos.length) { if (som) notify.toque(novos.some((c) => ['Crítica', 'Alta'].includes(c.prioridade)) ? 'critico' : 'novo'); falar(`Novo chamado${novos.length > 1 ? 's' : ''}: ${novos.slice(0, 2).map((c) => `${c.titulo}, setor ${c.setor}`).join('. ')}`); }
    }
    conhecidos.current = ids;
  }, [pend, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // alerta de atraso, no máx. a cada 5 min
    if (nAtr > 0 && som && Date.now() - ultimoAtraso.current > 300000) { ultimoAtraso.current = Date.now(); notify.toque('atrasado'); falar(`Atenção. ${nAtr} chamado${nAtr > 1 ? 's' : ''} fora do prazo.`); }
  }, [nAtr, som]); // eslint-disable-line react-hooks/exhaustive-deps

  const prazo = (c) => { const r = slaRestanteMs(c, sla); return r <= 0 ? `Atrasado ${fmtDuracao(-r)}` : `Resta ${fmtDuracao(r)}`; };
  const tela = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());

  return (
    <div className="tv">
      <header className="tv-head">
        <div><h1>Help<span style={{ fontWeight: 300, color: '#9fc0f5' }}>Hosp</span></h1><small>{nomeDepartamento(dep)}</small></div>
        <div className="tv-tools">
          <Link to="/admin"><button type="button"><ArrowLeft size={14} /> Sair</button></Link>
          <button type="button" aria-pressed={som} onClick={() => { setSom(!som); notify.liberarAudio(); }}><Volume2 size={14} /> Som</button>
          <button type="button" aria-pressed={voz} onClick={() => setVoz(!voz)}><Mic size={14} /> Voz</button>
          <button type="button" onClick={tela}><Maximize size={14} /> Tela cheia</button>
        </div>
        <div className="tv-kpis">
          <div className="tv-kpi"><b>{pend.length}</b><span>Pendentes</span></div>
          <div className="tv-kpi and"><b>{pend.filter((c) => c.status === 'Em Andamento').length}</b><span>Em andamento</span></div>
          <div className={`tv-kpi late${nAtr ? ' blink' : ''}`}><b>{nAtr}</b><span>Atrasados</span></div>
          <div className="tv-kpi ok"><b>{conc.length}</b><span>Concluídos hoje</span></div>
        </div>
        <div className="tv-clock"><b>{agora.toLocaleTimeString('pt-BR')}</b><span>{agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
      </header>
      <main className="tv-grid">
        <section className="tv-col"><h2>Em aberto <em>{pend.length}</em></h2>
          {pend.length === 0 && <div className="tv-empty">{loading ? 'Carregando…' : 'Nenhum chamado em aberto'}</div>}
          {pend.map((c) => (
            <article key={c.id} className={`tv-card p-${slug(c.prioridade)}${atrasado(c) ? ' late' : ''}`}>
              <div className="tv-top"><span>{c.protocolo}</span><span className={`tv-tag ${slug(c.prioridade)}`}>{c.prioridade || 'Média'}</span>{c.status !== 'A Fazer' && <span className="tv-tag">{c.status}</span>}{atrasado(c) && <span className="tv-tag late">{prazo(c)}</span>}</div>
              <div className="tv-title">{c.titulo || 'Sem título'}</div>
              <div className="tv-meta"><span>📍 {c.setor || '—'}</span><span>🕐 {hora(c.data_abertura)}</span>{c.tecnico && <span>🔧 {c.tecnico}</span>}{!atrasado(c) && <span>⏱ {prazo(c)}</span>}</div>
            </article>))}
        </section>
        <section className="tv-col"><h2>Concluídos hoje <em>{conc.length}</em></h2>
          {conc.length === 0 && <div className="tv-empty">Nenhuma conclusão registrada hoje</div>}
          {conc.map((c) => (<article key={c.id} className="tv-card done"><div className="tv-top"><span>{c.protocolo}</span></div><div className="tv-title">✔ {c.titulo}</div><div className="tv-meta"><span>📍 {c.setor || '—'}</span>{c.tecnico && <span>🔧 {c.tecnico}</span>}</div></article>))}
        </section>
      </main>
      <footer className="tv-foot"><span>{error ? 'Conexão perdida — tentando reconectar' : 'Monitoramento em tempo real'}</span><span>Sem dados pessoais exibidos</span></footer>
    </div>
  );
}
