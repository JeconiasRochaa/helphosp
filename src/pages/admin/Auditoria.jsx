import { Fragment, useMemo, useState } from 'react';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { toDate } from '@/lib/format';
import { ChevronDown, Download, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/useFirestore';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, EmptyState, PageHeader, SearchInput, Spinner } from '@/components/ui';
import { baixarArquivo, fmtData, paraCSV } from '@/lib/format';

const tom = (a) => (a.includes('falha') ? 'red' : /excluir|remover|restaurar|limpeza/.test(a) ? 'amber' : a.startsWith('auth') ? 'purple' : 'blue');

export default function Auditoria() {
  const { perms } = useAuth();
  const [busca, setBusca] = useState(''); const [grupo, setGrupo] = useState(''); const [aberto, setAberto] = useState(null);
  const { data, loading, error } = useCollection(() => perms.isAdmin
    ? query(collection(db, 'auditoria'), orderBy('criadoEm', 'desc'), limit(400))
    : query(collection(db, 'auditoria'), where('departamento', 'in', perms.depVariantes), limit(400)), [perms.isAdmin, perms.dep]);
  const grupos = useMemo(() => [...new Set(data.map((d) => String(d.acao).split('.')[0]))].sort(), [data]);
  const lista = data.slice().sort((a, b) => toDate(b.criadoEm) - toDate(a.criadoEm)).filter((d) => (!grupo || String(d.acao).startsWith(grupo + '.')) && (!busca || JSON.stringify([d.acao, d.autor, d.usuario, d.detalhe]).toLowerCase().includes(busca.toLowerCase())));
  const csv = () => baixarArquivo('auditoria.csv', paraCSV(lista, [{ titulo: 'Data', valor: (d) => fmtData(d.criadoEm) }, { titulo: 'Ação', valor: 'acao' }, { titulo: 'Autor', valor: 'autor' }, { titulo: 'Usuário', valor: 'usuario' }, { titulo: 'Detalhe', valor: (d) => JSON.stringify(d.detalhe) }]), 'text/csv;charset=utf-8');

  return (
    <>
      <PageHeader icon={ShieldCheck} title="Auditoria" subtitle="Registro imutável das ações no sistema (últimos 400 eventos)" actions={<Button variant="outline" size="sm" icon={Download} onClick={csv} disabled={!lista.length}>Exportar CSV</Button>} />
      <div className="filtros"><SearchInput value={busca} onChange={setBusca} placeholder="Buscar por ação, autor ou detalhe…" />
        <select className="select" value={grupo} onChange={(e) => setGrupo(e.target.value)}><option value="">Todas as áreas</option>{grupos.map((g) => <option key={g}>{g}</option>)}</select></div>
      {loading ? <Spinner /> : error ? <div className="card"><EmptyState title="Sem acesso ao registro">{error.code === 'failed-precondition' ? 'Crie o índice do Firestore (veja o link no console do navegador) ou faça deploy de firestore.indexes.json.' : 'Verifique suas permissões.'}</EmptyState></div>
        : lista.length === 0 ? <div className="card"><EmptyState title="Nenhum evento encontrado" /></div> : (
          <div className="table-card"><table><thead><tr><th>Quando</th><th>Ação</th><th>Autor</th><th>Perfil</th><th /></tr></thead>
            <tbody>{lista.map((d) => (<Fragment key={d.id}>
              <tr className="clicavel" onClick={() => setAberto(aberto === d.id ? null : d.id)}>
                <td className="nowrap">{fmtData(d.criadoEm)}</td><td><Badge tone={tom(d.acao)}>{d.acao}</Badge></td><td>{d.autor || <span className="muted">anônimo</span>}{d.usuario && <span className="muted"> @{d.usuario}</span>}</td><td className="text-sm">{d.perfil || '—'}</td><td><ChevronDown size={16} style={{ transform: aberto === d.id ? 'rotate(180deg)' : 'none', transition: '.2s' }} /></td></tr>
              {aberto === d.id && <tr><td colSpan={5} style={{ background: 'var(--card-2)' }}><pre className="mono text-xs" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify({ detalhe: d.detalhe, pagina: d.pagina, navegador: d.userAgent }, null, 2)}</pre></td></tr>}
            </Fragment>))}</tbody></table></div>)}
    </>
  );
}
