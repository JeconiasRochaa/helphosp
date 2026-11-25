import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, History } from 'lucide-react';
import { useHistorico } from '@/lib/ipam';
import { Badge, EmptyState, PageHeader, SearchInput, Spinner } from '@/components/ui';
import { fmtData } from '@/lib/format';

const TOM = { criar: 'green', editar: 'blue', excluir: 'red', importar: 'purple' };

export default function IpsHistorico() {
  const { data, loading, error } = useHistorico();
  const [busca, setBusca] = useState(''); const [acao, setAcao] = useState(''); const [aberto, setAberto] = useState(null);
  const lista = useMemo(() => data.filter((h) => (!acao || h.acao === acao) && (!busca || [h.ip, h.dispositivo, h.autor].some((v) => String(v || '').toLowerCase().includes(busca.toLowerCase())))), [data, busca, acao]);
  return (
    <>
      <PageHeader icon={History} title="Histórico de IPs" subtitle="Últimas 200 alterações em dispositivos de rede" />
      <div className="filtros"><SearchInput value={busca} onChange={setBusca} placeholder="Buscar por IP, dispositivo ou autor…" />
        <select className="select" value={acao} onChange={(e) => setAcao(e.target.value)}><option value="">Todas as ações</option>{Object.keys(TOM).map((a) => <option key={a}>{a}</option>)}</select></div>
      {loading ? <Spinner /> : error ? <div className="card"><EmptyState title="Não foi possível carregar o histórico" /></div> : lista.length === 0 ? <div className="card"><EmptyState icon={History} title="Sem registros" /></div> : (
        <div className="table-card"><table><thead><tr><th>Quando</th><th>Ação</th><th>Dispositivo</th><th>IP</th><th>Autor</th><th /></tr></thead>
          <tbody>{lista.map((h) => (
            <Fragment key={h.id}>
              <tr className="clicavel" onClick={() => setAberto(aberto === h.id ? null : h.id)}><td className="nowrap">{fmtData(h.criadoEm)}</td><td><Badge tone={TOM[h.acao]}>{h.acao}</Badge></td><td>{h.dispositivo}</td><td className="mono">{h.ip}</td><td>{h.autor}</td><td><ChevronDown size={16} style={{ transform: aberto === h.id ? 'rotate(180deg)' : 'none', transition: '.2s' }} /></td></tr>
              {aberto === h.id && <tr><td colSpan={6} style={{ background: 'var(--card-2)' }}>
                {h.mudancas && Object.keys(h.mudancas).length ? Object.entries(h.mudancas).map(([k, [a, d]]) => <div key={k} className="text-sm"><strong>{k}:</strong> <span style={{ color: 'var(--red-fg)', textDecoration: 'line-through' }}>{String(a) || '(vazio)'}</span> → <span style={{ color: 'var(--green-fg)' }}>{String(d) || '(vazio)'}</span></div>)
                  : <pre className="mono text-xs" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(h.depois || h.antes, null, 2)}</pre>}</td></tr>}
            </Fragment>))}</tbody></table></div>)}
    </>
  );
}
