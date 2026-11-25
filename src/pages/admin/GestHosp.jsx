import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Download, Eye, Trash2, ArrowRightCircle, Hospital, Clock, Loader, CheckCircle2, Inbox, ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useChamados } from '@/context/ChamadosContext';
import { Button, IconButton, PageHeader, StatCard, StatusBadge, SearchInput, EmptyState, Spinner } from '@/components/ui';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { avancarStatus } from '@/lib/chamadosApi';
import { baixarArquivo, fmtDia, paraCSV, toDate, somenteDigitos } from '@/lib/format';
import { STATUS_FLUXO, STATUS_LIST } from '@/lib/constants';
import { cpfMascarado, parseDados } from './gesthosp/helpers';
import DetalheModal from './gesthosp/DetalheModal';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function GestHosp() {
  const { perfil, perms } = useAuth();
  const { chamados, loading } = useChamados();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [profissao, setProfissao] = useState('');
  const [ord, setOrd] = useState({ campo: 'data', dir: 'desc' });
  const [abertoId, setAbertoId] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => chamados.filter((c) => c.tipo === 'gesthosp').map((c) => {
    const d = parseDados(c);
    return { c, d, nome: d.nome || c.solicitante || '', profissao: d.profissao || d.cargo || '', setor: d.setor || c.setor || '' };
  }), [chamados]);

  const profissoes = useMemo(() => [...new Set(lista.map((i) => i.profissao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [lista]);
  const contagem = useMemo(() => {
    const n = (s) => lista.filter((i) => (i.c.status || 'A Fazer') === s).length;
    return { total: lista.length, afazer: n('A Fazer'), andamento: n('Em Andamento') + n('Pendente'), concluido: n('Concluído') };
  }, [lista]);

  const filtrada = useMemo(() => {
    const q = norm(busca); const qd = somenteDigitos(busca);
    const r = lista.filter((i) => {
      if (status && (i.c.status || 'A Fazer') !== status) return false;
      if (profissao && i.profissao !== profissao) return false;
      if (!q) return true;
      return norm(i.c.protocolo).includes(q) || norm(i.nome).includes(q) || norm(i.profissao).includes(q) || norm(i.setor).includes(q)
        || (qd.length >= 3 && somenteDigitos(i.d.cpf).includes(qd));
    });
    const dir = ord.dir === 'asc' ? 1 : -1;
    const chave = { data: (i) => toDate(i.c.data_abertura).getTime(), nome: (i) => norm(i.nome), protocolo: (i) => i.c.protocolo || '', profissao: (i) => norm(i.profissao), status: (i) => STATUS_LIST.indexOf(i.c.status || 'A Fazer') }[ord.campo];
    return r.sort((a, b) => { const x = chave(a), y = chave(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  }, [lista, busca, status, profissao, ord]);

  const ordenar = (campo) => setOrd((o) => o.campo === campo ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: campo === 'data' ? 'desc' : 'asc' });
  const Th = ({ campo, children }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => ordenar(campo)} aria-sort={ord.campo === campo ? (ord.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <span className="row" style={{ gap: 4 }}>{children}{ord.campo === campo && (ord.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
    </th>
  );

  const avancar = async (c) => {
    if (!perfil) return;
    setOcupado(c.id);
    try {
      const r = await avancarStatus(c, perfil, perms);
      if (r.ok) notify.success(`Cadastro avançado para "${r.status}".`);
      else notify.warning(r.motivo);
    } catch (e) { console.error(e); notify.error('Não foi possível alterar o status.'); }
    finally { setOcupado(null); }
  };

  const excluir = async (c) => {
    if (!perms.podeExcluir) return;
    const ok = await notify.confirm(`O cadastro ${c.protocolo || ''} e todos os dados pessoais associados serão excluídos permanentemente.`, { titulo: 'Excluir cadastro', confirmar: 'Excluir' });
    if (!ok) return;
    setOcupado(c.id);
    try {
      await deleteDoc(doc(db, 'chamados', c.id));
      audit('gesthosp.excluir', { protocolo: c.protocolo, chamado: c.id });
      notify.success('Cadastro excluído.');
      setAbertoId((x) => (x === c.id ? null : x));
    } catch (e) { console.error(e); notify.error('Não foi possível excluir o cadastro.'); }
    finally { setOcupado(null); }
  };

  const exportar = () => {
    // LGPD: sem CPF, RG, e-mail, telefone, endereço ou data de nascimento.
    const csv = paraCSV(filtrada, [
      { titulo: 'Protocolo', valor: (i) => i.c.protocolo || '' },
      { titulo: 'Data de abertura', valor: (i) => fmtDia(i.c.data_abertura) },
      { titulo: 'Profissional', valor: (i) => i.nome },
      { titulo: 'Profissão', valor: (i) => i.profissao },
      { titulo: 'Setor', valor: (i) => i.setor },
      { titulo: 'Status', valor: (i) => i.c.status || '' }
    ]);
    baixarArquivo(`gesthosp-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
    audit('gesthosp.exportar', { registros: filtrada.length });
    notify.success(`${filtrada.length} registro(s) exportado(s) sem dados sensíveis.`);
  };

  const aberto = abertoId ? lista.find((i) => i.c.id === abertoId) : null;
  const filtrado = busca || status || profissao;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHeader title="GestHosp" icon={Hospital} subtitle="Solicitações de cadastro de profissionais"
        actions={<Button variant="outline" icon={Download} onClick={exportar} disabled={!filtrada.length}>Exportar CSV</Button>} />

      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
        <StatCard icon={Inbox} label="Solicitações" value={contagem.total} tone="blue" onClick={() => setStatus('')} />
        <StatCard icon={Clock} label="A fazer" value={contagem.afazer} tone="amber" onClick={() => setStatus('A Fazer')} />
        <StatCard icon={Loader} label="Em andamento" value={contagem.andamento} tone="purple" onClick={() => setStatus('Em Andamento')} />
        <StatCard icon={CheckCircle2} label="Concluídos" value={contagem.concluido} tone="green" onClick={() => setStatus('Concluído')} />
      </div>

      <div className="lgpd-box"><ShieldAlert size={16} style={{ flex: 'none' }} /><span>O CPF é exibido mascarado. Dados pessoais completos só estão disponíveis no detalhe do cadastro, e cada acesso é registrado na auditoria.</span></div>

      <div className="filtros" style={{ marginBottom: 0 }}>
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por protocolo, nome, profissão, setor ou CPF..." />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {STATUS_LIST.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" value={profissao} onChange={(e) => setProfissao(e.target.value)} aria-label="Filtrar por profissão">
          <option value="">Todas as profissões</option>
          {profissoes.map((p) => <option key={p}>{p}</option>)}
        </select>
        {filtrado && <Button variant="ghost" size="sm" onClick={() => { setBusca(''); setStatus(''); setProfissao(''); }}>Limpar filtros</Button>}
      </div>

      {loading ? <Spinner label="Carregando cadastros..." /> : filtrada.length === 0 ? (
        <div className="card"><EmptyState icon={Inbox} title={filtrado ? 'Nenhum cadastro encontrado' : 'Nenhuma solicitação de cadastro'}>
          {filtrado ? 'Ajuste os filtros para ver outros resultados.' : 'As solicitações enviadas pelo portal aparecerão aqui.'}</EmptyState></div>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr>
              <Th campo="protocolo">Protocolo</Th><Th campo="data">Data</Th><Th campo="nome">Profissional</Th>
              <th>CPF</th><Th campo="profissao">Profissão</Th><th>Setor</th><Th campo="status">Status</Th><th style={{ width: 130 }}>Ações</th>
            </tr></thead>
            <tbody>
              {filtrada.map(({ c, d, nome, profissao: prof, setor }) => (
                <tr key={c.id} className="clicavel" onClick={() => setAbertoId(c.id)}>
                  <td><strong>{c.protocolo || '—'}</strong></td>
                  <td className="nowrap">{fmtDia(c.data_abertura)}</td>
                  <td><strong>{nome || '—'}</strong></td>
                  <td className="nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{cpfMascarado(d.cpf)}</td>
                  <td>{prof || '—'}</td>
                  <td>{setor || '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row" style={{ gap: 4 }}>
                      <IconButton icon={Eye} label="Ver detalhes" onClick={() => setAbertoId(c.id)} />
                      {STATUS_FLUXO[c.status || 'A Fazer'] && <IconButton icon={ArrowRightCircle} label={`Avançar para "${STATUS_FLUXO[c.status || 'A Fazer']}"`} disabled={ocupado === c.id} onClick={() => avancar(c)} />}
                      {perms.podeExcluir && <IconButton icon={Trash2} label="Excluir" disabled={ocupado === c.id} onClick={() => excluir(c)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted text-xs">{filtrada.length} de {lista.length} cadastro(s)</p>

      {aberto && <DetalheModal chamado={aberto.c} dados={aberto.d} onClose={() => setAbertoId(null)} ocupado={ocupado === aberto.c.id}
        podeExcluir={perms.podeExcluir} onAvancar={() => avancar(aberto.c)} onExcluir={() => excluir(aberto.c)} />}
    </div>
  );
}
