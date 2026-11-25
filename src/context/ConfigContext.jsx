import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { SETORES_PADRAO, SLA_TEMPOS } from '@/lib/constants';

const Ctx = createContext(null);
export const useConfig = () => useContext(Ctx);

const ordenar = (l) => l.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));

/**
 * Lê configuracoes/{setores, departamentos_chamados, logos, sla, notificacoes}.
 * `sla` é devolvido em ms por prioridade (aceita doc com minutos/horas — ver normalizarSLA).
 */
export function ConfigProvider({ children }) {
  const { user } = useAuth();
  const [setores, setSetores] = useState(ordenar(SETORES_PADRAO));
  const [departamentos, setDepartamentos] = useState(['TI', 'MANUTENCAO']);
  const [logos, setLogos] = useState({ hospital: null, governo: null });
  const [slaDoc, setSlaDoc] = useState(null);
  const [notifDoc, setNotifDoc] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    const on = (nome, fn) => onSnapshot(doc(db, 'configuracoes', nome), (s) => fn(s.exists() ? s.data() : null), () => {});
    const u = [
      on('setores', (d) => Array.isArray(d?.setores) && d.setores.length && setSetores(ordenar(d.setores))),
      on('departamentos_chamados', (d) => Array.isArray(d?.departamentos) && d.departamentos.length && setDepartamentos(d.departamentos)),
      on('logos', (d) => d && setLogos({ hospital: d.hospital || null, governo: d.governo || null })),
      on('sla', setSlaDoc),
      on('notificacoes', setNotifDoc)
    ];
    return () => u.forEach((f) => f());
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const sla = useMemo(() => normalizarSLA(slaDoc), [slaDoc]);

  const value = useMemo(() => ({ setores, departamentos, logos, sla, slaDoc, notifDoc }), [setores, departamentos, logos, sla, slaDoc, notifDoc]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Converte configuracoes/sla ({slaCritico, slaAlta, slaMedia, slaBaixa} em MINUTOS) em { prioridade: ms }. */
export function normalizarSLA(d) {
  const out = { ...SLA_TEMPOS };
  if (!d) return out;
  const mapa = { 'Crítica': 'slaCritico', 'Alta': 'slaAlta', 'Média': 'slaMedia', 'Baixa': 'slaBaixa' };
  for (const [prio, campo] of Object.entries(mapa)) {
    const v = Number(d[campo]);
    if (v > 0) out[prio] = v * 60 * 1000;
  }
  return out;
}
