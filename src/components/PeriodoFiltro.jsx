import { useMemo, useState } from 'react';
import { Field } from '@/components/ui';
import { OPCOES_PERIODO, periodo } from '@/lib/periodo';

/** const p = usePeriodo('30');  →  p.de, p.ate  e <PeriodoFiltro p={p} /> */
export function usePeriodo(inicial = '30') {
  const [tipo, setTipo] = useState(inicial); const [ini, setIni] = useState(''); const [fim, setFim] = useState('');
  const [de, ate] = useMemo(() => periodo(tipo, ini, fim), [tipo, ini, fim]);
  return { tipo, setTipo, ini, setIni, fim, setFim, de, ate };
}
export default function PeriodoFiltro({ p }) {
  return (
    <>
      <Field label="Período"><select className="select" value={p.tipo} onChange={(e) => p.setTipo(e.target.value)}>{OPCOES_PERIODO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      {p.tipo === 'personalizado' && <><Field label="De"><input className="input" type="date" value={p.ini} onChange={(e) => p.setIni(e.target.value)} /></Field><Field label="Até"><input className="input" type="date" value={p.fim} onChange={(e) => p.setFim(e.target.value)} /></Field></>}
    </>
  );
}
