import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { LogIn, Moon, ShieldPlus, Sun } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { notify } from '@/lib/notify';
import { toDate } from '@/lib/format';

const Ctx = createContext({ chamados: [], loading: true, erro: null });
export const useMeusChamados = () => useContext(Ctx);

/**
 * Chamados DESTE aparelho (deviceUid == uid anônimo do Firebase Auth).
 * As regras do Firestore impedem ler chamados de outros aparelhos — a privacidade não depende da tela.
 * Também avisa (toast + sino + push) quando o status muda ou a equipe responde.
 */
function MeusChamadosProvider({ children }) {
  const { user, isStaff } = useAuth();
  const [state, setState] = useState({ chamados: [], loading: true, erro: null });
  const anterior = useRef(null);

  useEffect(() => {
    if (!user || isStaff) return undefined;
    anterior.current = null;
    const q = query(collection(db, 'chamados'), where('deviceUid', '==', user.uid));
    return onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toDate(b.data_abertura) - toDate(a.data_abertura));
      setState({ chamados: lista, loading: false, erro: null });
      if (anterior.current && !snap.metadata.hasPendingWrites) {
        lista.forEach((c) => {
          const antes = anterior.current.get(c.id);
          if (!antes) return;
          if (antes.status !== c.status) {
            const concl = c.status === 'Concluído';
            notify.evento({ categoria: 'chamado', nivel: concl ? 'success' : 'info', titulo: concl ? 'Chamado concluído' : 'Chamado atualizado',
              mensagem: `${c.protocolo} — agora está "${c.status}"`, link: `/meus-chamados/${c.id}`, acaoTexto: 'Ver chamado', chave: `st-${c.id}-${c.status}`, som: concl ? 'concluido' : 'novo' });
          }
          const t = toDate(c.ultimo_comentario_em).getTime();
          if (c.ultimo_comentario_por === 'equipe' && t && t !== antes.t) {
            notify.evento({ categoria: 'mensagem', nivel: 'info', titulo: 'A equipe respondeu seu chamado', mensagem: `${c.protocolo} — ${c.titulo}`,
              link: `/meus-chamados/${c.id}`, acaoTexto: 'Ler resposta', chave: `msg-${c.id}-${t}` });
          }
        });
      }
      anterior.current = new Map(lista.map((c) => [c.id, { status: c.status, t: toDate(c.ultimo_comentario_em).getTime() }]));
    }, (erro) => { console.error(erro); setState({ chamados: [], loading: false, erro }); });
  }, [user?.uid, isStaff]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={useMemo(() => state, [state])}>{children}</Ctx.Provider>;
}

export default function PortalShell() {
  const { tema, alternar } = useTheme();
  const { isStaff } = useAuth();
  const loc = useLocation();
  useEffect(() => { notify.navegar = null; }, []);
  return (
    <MeusChamadosProvider>
      <div className="portal">
        <div className="portal-hero" style={loc.pathname === '/' ? undefined : { paddingBottom: 70 }}>
          <div className="portal-wrap">
            <div className="portal-nav">
              <Link to="/" className="row" style={{ color: '#fff', textDecoration: 'none', gap: 11 }}>
                <div className="sb-logo"><ShieldPlus size={22} color="#fff" /></div>
                <div><strong style={{ fontSize: 18, display: 'block' }}>HelpHosp</strong><span className="text-xs" style={{ opacity: .65 }}>Central de chamados</span></div>
              </Link>
              <div className="row">
                <button className="icon-btn" style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={alternar} aria-label="Alternar tema">{tema === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
                <a href="/login" className="link-discreto"><LogIn size={12} />Acesso técnico</a>
              </div>
            </div>
            <Hero />
          </div>
        </div>
        <div className="portal-main"><Outlet /></div>
      </div>
    </MeusChamadosProvider>
  );
}

function Hero() {
  const loc = useLocation();
  if (loc.pathname !== '/') return null;
  return (
    <div style={{ color: '#fff', padding: '40px 0 6px' }}>
      <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15 }}>Como podemos ajudar hoje?</h1>
      <p style={{ opacity: .75, marginTop: 10, maxWidth: 520 }}>Abra um chamado para a equipe de TI ou Manutenção e acompanhe o andamento em tempo real.</p>
    </div>
  );
}
