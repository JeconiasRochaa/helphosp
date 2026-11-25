import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ChevronDown, Headset, Monitor, Building, Wrench, Lock, ArrowRight } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { useMeusChamados } from '@/components/PortalShell';
import { DEPARTAMENTO_INFO } from '@/lib/constants';
import { linkWhatsApp, normalizarDepartamento } from '@/lib/format';
import { Badge } from '@/components/ui';

const IMG = { TI: '/img/ti.jpg', MANUTENCAO: '/img/manutencao.jpg' };
const ICONES = { 'fa-desktop': Monitor, 'fa-screwdriver-wrench': Wrench };
const GRADS = ['linear-gradient(135deg,#2f6fed,#1b4f9c)', 'linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#0fb5b0,#0b8a86)', 'linear-gradient(135deg,#7c5cfc,#5b3fd6)'];

export default function Home() {
  const { user } = useAuth();
  const { departamentos } = useConfig();
  const { chamados } = useMeusChamados();
  const [contatos, setContatos] = useState([]);
  const [aberto, setAberto] = useState(false);
  const abertos = chamados.filter((c) => c.status !== 'Concluído').length;

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(query(collection(db, 'contatos_publicos')), (s) => setContatos(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.departamento).localeCompare(b.departamento) || String(a.nome).localeCompare(b.nome))), () => {});
  }, [user]);

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="card" style={{ padding: 0 }}>
        <button className="row" style={{ width: '100%', padding: '16px 18px', background: 'none', border: 0, cursor: 'pointer', color: 'var(--text)', font: 'inherit', fontWeight: 700 }} onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
          <Headset size={18} color="var(--blue)" /> Fale direto com um técnico <span className="spacer" /><ChevronDown size={18} style={{ transition: '.2s', transform: aberto ? 'rotate(180deg)' : 'none' }} />
        </button>
        {aberto && (
          <div className="grid-auto" style={{ padding: '0 18px 18px', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))' }}>
            {contatos.length === 0 && <span className="muted text-sm">Nenhum técnico disponível para contato no momento.</span>}
            {contatos.map((c) => {
              const manut = normalizarDepartamento(c.departamento) === 'MANUTENCAO';
              return (
                <a key={c.id} href={linkWhatsApp(c.whatsapp) || '#'} target="_blank" rel="noopener noreferrer" className="chamado-card" style={{ flexWrap: 'nowrap' }}>
                  <div className="avatar">{manut ? <Wrench size={16} /> : <Monitor size={16} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block' }}>{c.nome}</strong><small className="muted">{c.cargo || 'Técnico'}</small></div>
                  <Badge tone={manut ? 'amber' : 'blue'}>{manut ? 'MANUTENÇÃO' : 'TI'}</Badge>
                </a>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
        {departamentos.map((dep, i) => {
          const info = DEPARTAMENTO_INFO[dep] || { icone: 'fa-building', titulo: dep, descricao: `Abrir chamado para ${dep}` };
          const Icon = ICONES[info.icone] || Building;
          return (
            <Link key={dep} to={`/abrir/${encodeURIComponent(dep)}`} className="action-card com-img">
              {IMG[dep] ? <img className="ac-img" src={IMG[dep]} alt={info.titulo} loading="lazy" decoding="async" /> : <div className="ac-img ac-fallback" style={{ background: GRADS[i % GRADS.length] }}><Icon size={44} color="#fff" /></div>}
              <div className="ac-body"><h3>{info.titulo}</h3><p>{info.descricao}</p><span className="ac-cta">Abrir chamado <ArrowRight size={14} /></span></div>
            </Link>
          );
        })}
        <Link to="/gesthosp" className="action-card com-img">
          <img className="ac-img" src="/img/gesthosp.jpg" alt="GestHosp" loading="lazy" decoding="async" />
          <div className="ac-body"><h3>Cadastro GestHosp</h3><p>Solicitar cadastro de profissional no sistema</p><span className="ac-cta">Solicitar <ArrowRight size={14} /></span></div>
        </Link>
        <Link to="/meus-chamados" className="action-card com-img">
          <img className="ac-img" src="/img/chamados.jpg" alt="Acompanhar chamados" loading="lazy" decoding="async" />
          <div className="ac-body"><h3 className="row">Acompanhar chamados {abertos > 0 && <Badge tone="blue">{abertos} em aberto</Badge>}</h3>
          <p>Veja o andamento dos chamados abertos <strong>neste aparelho</strong>.</p><span className="ac-cta">Ver andamento <ArrowRight size={14} /></span></div>
        </Link>
      </div>

      <div className="aviso-device"><Lock size={16} style={{ flex: 'none', marginTop: 2 }} />
        <div><strong>Sua privacidade importa.</strong> Os chamados ficam vinculados a este aparelho: só você os vê aqui, e ninguém consegue consultar os chamados de outras pessoas.</div>
      </div>

    </div>
  );
}
