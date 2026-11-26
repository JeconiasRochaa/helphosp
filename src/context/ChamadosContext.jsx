import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
import { notify } from '@/lib/notify';
import { slaEstado } from '@/lib/sla';
import { toDate } from '@/lib/format';
import { sincronizarEspelhos } from '@/lib/tvSync';

const Ctx = createContext({ chamados: [], loading: true });
export const useChamados = () => useContext(Ctx);

/**
 * Chamados do departamento do usuário em tempo real + detecção de eventos:
 * novo chamado, novo comentário do solicitante e SLA (próximo/atrasado).
 */
export function ChamadosProvider({ children }) {
  const { perfil, perms, user } = useAuth();
  const { sla, notifDoc } = useConfig();
  const [state, setState] = useState({ chamados: [], loading: true });
  const ultimoRef = useRef(new Map());   // id -> ultimo_comentario_em (ms)
  const primeiro = useRef(true);
  const chamadosRef = useRef([]);
  const slaRef = useRef(sla); slaRef.current = sla;
  const alertaSla = notifDoc?.alertaSLA !== false;

  useEffect(() => {
    if (!perfil) return undefined;
    primeiro.current = true; ultimoRef.current = new Map();
    const q = query(collection(db, 'chamados'), where('departamento', 'in', perms.depVariantes));
    return onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, fid: d.id, ...d.data() }))
        .sort((a, b) => toDate(b.data_abertura) - toDate(a.data_abertura));
      chamadosRef.current = lista;
      if (!snap.metadata.hasPendingWrites) sincronizarEspelhos(lista);   // alimenta o Painel TV público
      setState({ chamados: lista, loading: false });

      if (!primeiro.current && !snap.metadata.hasPendingWrites) {
        snap.docChanges().forEach((ch) => {
          const c = { id: ch.doc.id, ...ch.doc.data() };
          if (ch.type === 'added' && c.status === 'A Fazer' && c.tipo !== 'toner' && c.deviceUid !== user?.uid) {
            const crit = c.prioridade === 'Crítica';
            notify.evento({
              categoria: 'chamado', nivel: crit ? 'critical' : c.prioridade === 'Alta' ? 'warning' : 'info',
              titulo: `${crit ? 'Chamado crítico' : 'Novo chamado'} · ${c.prioridade || 'Média'}`,
              mensagem: `${c.titulo || 'Sem título'} — ${c.setor || '—'} · ${c.solicitante || '—'}` + (c.fotos?.length ? ` · ${c.fotos.length} foto(s)` : ''),
              link: `/admin/chamados/${c.id}`, acaoTexto: 'Abrir chamado', chave: `novo-${c.id}`, som: crit ? 'critico' : 'novo'
            });
          }
          if (ch.type === 'modified' && c.ultimo_comentario_por === 'solicitante') {
            const t = toDate(c.ultimo_comentario_em).getTime();
            if (t && t !== ultimoRef.current.get(c.id)) {
              notify.evento({
                categoria: 'mensagem', nivel: 'info', titulo: 'Nova mensagem do solicitante',
                mensagem: `${c.protocolo} · ${c.titulo}`, link: `/admin/chamados/${c.id}`, acaoTexto: 'Ver conversa', chave: `msg-${c.id}-${t}`
              });
            }
          }
        });
      }
      lista.forEach((c) => ultimoRef.current.set(c.id, toDate(c.ultimo_comentario_em).getTime()));
      primeiro.current = false;
    }, (e) => { console.error(e); notify.error('Conexão com o servidor instável. Os dados podem estar desatualizados.', { chave: 'conn' }); setState((s) => ({ ...s, loading: false })); });
  }, [perfil?.uid, perms.dep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vigia de SLA (a cada minuto)
  useEffect(() => {
    if (!perfil || !alertaSla) return undefined;
    const checar = () => {
      chamadosRef.current.filter((c) => c.tipo !== 'gesthosp' && c.tipo !== 'toner' && c.status !== 'Concluído').forEach((c) => {
        const e = slaEstado(c, slaRef.current);
        if (e === 'critical') notify.evento({ categoria: 'sla', nivel: 'critical', titulo: 'SLA estourado', mensagem: `${c.protocolo} · ${c.titulo}`, link: `/admin/chamados/${c.id}`, chave: `sla-crit-${c.id}`, som: 'atrasado', push: true });
        else if (e === 'warning') notify.evento({ categoria: 'sla', nivel: 'warning', titulo: 'SLA próximo do limite', mensagem: `${c.protocolo} · ${c.titulo}`, link: `/admin/chamados/${c.id}`, chave: `sla-warn-${c.id}`, toast: false, push: false });
      });
    };
    const t0 = setTimeout(checar, 4000); const t = setInterval(checar, 60000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [perfil?.uid, alertaSla]);

  const value = useMemo(() => {
    // `tickets` = chamados reais de suporte (sem cadastros GestHosp nem registros de troca de toner)
    const ticket = state.chamados.filter((c) => c.tipo !== 'gesthosp' && c.tipo !== 'toner');
    return { ...state, tickets: ticket, abertos: ticket.filter((c) => c.status !== 'Concluído') };
  }, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
