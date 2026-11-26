import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Clock, MapPin, Maximize, Mic, Monitor, Volume2, Wrench, ShieldPlus, UserRound } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useConfig } from '@/context/ConfigContext';
import Relogio from '@/components/Relogio';
import { depVariantes, fmtDuracao, normalizarDepartamento, nomeDepartamento, toDate } from '@/lib/format';
import { slaEstado, slaPrazo, slaRestanteMs } from '@/lib/sla';
import { notify } from '@/lib/notify';
import './tv/tv.css';

const PESO = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
const slug = (p) => String(p || 'Média').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const hora = (v) => toDate(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Painel TV — acesso livre (sem login). Lê apenas o espelho público e anônimo `tv_chamados`. */
export default function PainelTV() {
  const [sp] = useSearchParams();
  const depParam = sp.get('dep');
  if (!depParam) return <Escolha />;
  return <Painel dep={normalizarDepartamento(depParam)} />;
}

function Escolha() {
  return (
    <div className="tv tv-escolha">
      <div className="tv-logo"><ShieldPlus size={30} /> HelpHosp <span>Painel TV</span></div>
      <h1>Qual painel exibir?</h1>
      <div className="tv-opcoes">
        <Link to="/tv?dep=TI"><Monitor size={40} /><b>TI</b><span>Tecnologia da Informação</span></Link>
        <Link to="/tv?dep=MANUTENCAO"><Wrench size={40} /><b>Manutenção</b><span>Elétrica, hidráulica, predial</span></Link>
      </div>
    </div>
  );
}

function Painel({ dep }) {
  const { sla } = useConfig();
  const [agora, setAgora] = useState(new Date()); const [som, setSom] = useState(true); const [voz, setVoz] = useState(true);
  const { data, loading, error } = useCollection(() => query(collection(db, 'tv_chamados'), where('departamento', 'in', depVariantes(dep))), [dep]);
  const conhecidos = useRef(null); const ultimoAtraso = useRef(0);

  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 30000); return () => clearInterval(t); }, []);
  const lista = useMemo(() => data.filter((c) => c.tipo !== 'gesthosp' && c.tipo !== 'toner'), [data]);
  const inicioDia = useMemo(() => { const d = new Date(agora); d.setHours(0, 0, 0, 0); return d; }, [agora.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const atrasado = (c) => slaEstado(c, sla) === 'critical';
  const pend = useMemo(() => lista.filter((c) => c.status !== 'Concluído').sort((a, b) => (atrasado(a) ? 0 : 1) - (atrasado(b) ? 0 : 1) || (PESO[a.prioridade] ?? 2) - (PESO[b.prioridade] ?? 2) || toDate(a.data_abertura) - toDate(b.data_abertura)), [lista, sla, agora]); // eslint-disable-line react-hooks/exhaustive-deps
  const conc = useMemo(() => lista.filter((c) => c.status === 'Concluído' && toDate(c.data_atualizacao || c.data_abertura) >= inicioDia).sort((a, b) => toDate(b.data_atualizacao || b.data_abertura) - toDate(a.data_atualizacao || a.data_abertura)), [lista, inicioDia]);
  const nAtr = pend.filter(atrasado).length; const nAnd = pend.filter((c) => c.status === 'Em Andamento').length;

  const falar = (t) => { if (!voz || !('speechSynthesis' in window)) return; try { const u = new SpeechSynthesisUtterance(t); u.lang = 'pt-BR'; speechSynthesis.speak(u); } catch { /* */ } };
  useEffect(() => {
    if (loading) return;
    const ids = new Set(pend.map((c) => c.id));
    if (conhecidos.current) {
      const novos = pend.filter((c) => !conhecidos.current.has(c.id));
      if (novos.length) { if (som) notify.toque(novos.some((c) => ['Crítica', 'Alta'].includes(c.prioridade)) ? 'critico' : 'novo'); falar(`Novo chamado${novos.length > 1 ? 's' : ''}: ${novos.slice(0, 2).map((c) => `${c.categoria}, setor ${c.setor}`).join('. ')}`); }
    }
    conhecidos.current = ids;
  }, [pend, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (nAtr > 0 && som && Date.now() - ultimoAtraso.current > 300000) { ultimoAtraso.current = Date.now(); notify.toque('atrasado'); falar(`Atenção. ${nAtr} chamado${nAtr > 1 ? 's' : ''} fora do prazo.`); }
  }, [nAtr, som]); // eslint-disable-line react-hooks/exhaustive-deps

  const prazoTxt = (c) => { const r = slaRestanteMs(c, sla); return r <= 0 ? `Atrasado ${fmtDuracao(-r)}` : `Resta ${fmtDuracao(r)}`; };
  const pct = (c) => Math.min(100, Math.max(0, ((slaPrazo(c.prioridade, sla) - slaRestanteMs(c, sla)) / slaPrazo(c.prioridade, sla)) * 100));
  const tela = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const Ico = normalizarDepartamento(dep) === 'MANUTENCAO' ? Wrench : Monitor;

  return (
    <div className="tv">
      <header className="tv-head">
        <div className="tv-brand"><div className="tv-logo-ico"><ShieldPlus size={26} /></div><div><h1>Help<span>Hosp</span></h1><small><Ico size={11} /> {nomeDepartamento(dep)}</small></div></div>
        <div className="tv-kpis">
          <div className="tv-kpi"><b>{pend.length}</b><span>Em aberto</span></div>
          <div className="tv-kpi and"><b>{nAnd}</b><span>Em atendimento</span></div>
          <div className={`tv-kpi late${nAtr ? ' blink' : ''}`}><b>{nAtr}</b><span>Atrasados</span></div>
          <div className="tv-kpi ok"><b>{conc.length}</b><span>Concluídos hoje</span></div>
        </div>
        <Relogio tamanho="xl" className="tv-relogio" />
      </header>
      <div className="tv-tools">
        <button type="button" aria-pressed={som} onClick={() => { setSom(!som); notify.liberarAudio(); }}><Volume2 size={14} /> Som</button>
        <button type="button" aria-pressed={voz} onClick={() => setVoz(!voz)}><Mic size={14} /> Voz</button>
        <button type="button" onClick={tela}><Maximize size={14} /> Tela cheia</button>
      </div>
      {nAtr > 0 && <div className="tv-alerta"><AlertTriangle size={22} /> {nAtr} chamado{nAtr > 1 ? 's' : ''} fora do prazo de atendimento</div>}
      <main className="tv-grid">
        <section className="tv-col"><h2><Clock size={16} /> Em aberto <em>{pend.length}</em></h2>
          {pend.length === 0 && <div className="tv-empty">{loading ? 'Carregando…' : <><CheckCircle2 size={42} />Tudo em dia! Nenhum chamado em aberto.</>}</div>}
          <div className="tv-cards">
            {pend.map((c) => (
              <article key={c.id} className={`tv-card p-${slug(c.prioridade)}${atrasado(c) ? ' late' : ''}${c.status === 'Em Andamento' ? ' and' : ''}`}>
                <div className="tv-top"><span className="tv-proto">{c.protocolo}</span><span className={`tv-tag ${slug(c.prioridade)}`}>{c.prioridade || 'Média'}</span>{c.status === 'Em Andamento' && <span className="tv-tag and">Em atendimento</span>}{atrasado(c) && <span className="tv-tag late">{prazoTxt(c)}</span>}</div>
                <div className="tv-title">{c.categoria || 'Chamado'}</div>
                <div className="tv-meta"><span><MapPin size={14} /> {c.setor || '—'}</span><span><Clock size={14} /> {hora(c.data_abertura)}</span>{c.tecnico && <span><UserRound size={14} /> {c.tecnico}</span>}</div>
                <div className="tv-bar" title={prazoTxt(c)}><i style={{ width: pct(c) + '%' }} /></div>
              </article>))}
          </div>
        </section>
        <section className="tv-col done"><h2><CheckCircle2 size={16} /> Concluídos hoje <em>{conc.length}</em></h2>
          {conc.length === 0 && <div className="tv-empty">Nenhuma conclusão registrada hoje</div>}
          <div className="tv-cards">
            {conc.map((c) => (<article key={c.id} className="tv-card done"><div className="tv-top"><span className="tv-proto">{c.protocolo}</span><span className="tv-tag ok">Concluído {hora(c.data_atualizacao)}</span></div><div className="tv-title"><CheckCircle2 size={17} /> {c.categoria || 'Chamado'}</div><div className="tv-meta"><span><MapPin size={14} /> {c.setor || '—'}</span>{c.tecnico && <span><UserRound size={14} /> {c.tecnico}</span>}</div></article>))}
          </div>
        </section>
      </main>
      <footer className="tv-foot"><span><i className={error ? 'off' : 'on'} /> {error ? 'Conexão perdida — tentando reconectar' : 'Monitoramento em tempo real'}</span><span>Exibe apenas tipo de problema, setor e andamento — sem dados pessoais</span></footer>
    </div>
  );
}
