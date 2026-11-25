import { useCallback, useMemo, useState } from 'react';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { ClipboardList, Download, Pencil, Plus, Trash2, Boxes, MapPin, Search as SearchIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useConfig } from '@/context/ConfigContext';
import { useCollection } from '@/hooks/useFirestore';
import { Badge, Button, EmptyState, IconButton, PageHeader, SearchInput, Spinner, StatCard } from '@/components/ui';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { baixarArquivo, paraCSV } from '@/lib/format';
import { TIPOS, cmpSetor, norm, num, totalSetor } from './inventario/helpers';
import InventarioForm from './inventario/InventarioForm';
import DetalheModal from './inventario/DetalheModal';

const ORDENS = {
  setor: { rotulo: 'Setor (A–Z)', fn: cmpSetor },
  maior: { rotulo: 'Mais equipamentos', fn: (a, b) => totalSetor(b) - totalSetor(a) || cmpSetor(a, b) },
  menor: { rotulo: 'Menos equipamentos', fn: (a, b) => totalSetor(a) - totalSetor(b) || cmpSetor(a, b) }
};

export default function Inventario() {
  const { setores } = useConfig();
  const { data, loading, error } = useCollection(() => collection(db, 'inventario'), []);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('setor');
  const [modal, setModal] = useState(null); // { tipo: 'form'|'detalhe', id? }
  const fechar = useCallback(() => setModal(null), []);

  const totais = useMemo(() => {
    const t = Object.fromEntries(TIPOS.map((x) => [x.id, 0]));
    data.forEach((i) => TIPOS.forEach((x) => { t[x.id] += num(i[x.id]); }));
    return { ...t, geral: TIPOS.reduce((s, x) => s + t[x.id], 0) };
  }, [data]);

  const lista = useMemo(() => {
    const q = norm(busca);
    return data.filter((i) => !q || norm(i.setor).includes(q)).sort(ORDENS[ordem].fn);
  }, [data, busca, ordem]);

  const item = modal?.id ? data.find((i) => i.id === modal.id) : null;

  const excluir = async (i) => {
    const ok = await notify.confirm(`Remover o inventário do setor "${i.setor}" (${totalSetor(i)} equipamentos)? Esta ação não pode ser desfeita.`, { titulo: 'Excluir inventário', confirmar: 'Excluir' });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'inventario', i.id));
      audit('inventario.excluir', { setor: i.setor, total: totalSetor(i) });
      notify.success('Inventário removido.');
      setModal(null);
    } catch (e) { console.error(e); notify.error('Não foi possível excluir o inventário.'); }
  };

  const exportar = () => {
    const csv = paraCSV(lista, [
      { titulo: 'Setor', valor: (i) => i.setor || '' },
      ...TIPOS.map((t) => ({ titulo: t.label, valor: (i) => num(i[t.id]) })),
      { titulo: 'Total', valor: (i) => totalSetor(i) }
    ]);
    baixarArquivo(`inventario-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
    audit('inventario.exportar', { setores: lista.length });
    notify.success(`${lista.length} setor(es) exportado(s).`);
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <PageHeader title="Inventário" icon={ClipboardList} subtitle="Equipamentos por setor"
        actions={<>
          <Button variant="outline" icon={Download} onClick={exportar} disabled={!lista.length}>Exportar CSV</Button>
          <Button icon={Plus} onClick={() => setModal({ tipo: 'form' })}>Novo setor</Button>
        </>} />

      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))' }}>
        <StatCard icon={Boxes} label="Total de equipamentos" value={totais.geral} tone="blue" hint={`${data.length} setor(es)`} />
        {TIPOS.map((t) => <StatCard key={t.id} icon={t.icon} label={t.label} value={totais[t.id]} tone={t.tone} />)}
      </div>

      <div className="filtros" style={{ marginBottom: 0 }}>
        <SearchInput value={busca} onChange={setBusca} placeholder="Filtrar setor..." />
        <select className="select" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
          {Object.entries(ORDENS).map(([k, o]) => <option key={k} value={k}>{o.rotulo}</option>)}
        </select>
      </div>

      {loading ? <Spinner label="Carregando inventário..." /> : error ? (
        <div className="card"><EmptyState icon={SearchIcon} title="Não foi possível carregar o inventário">Verifique sua conexão e permissões e tente novamente.</EmptyState></div>
      ) : lista.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title={busca ? 'Nenhum setor encontrado' : 'Inventário vazio'}
          action={!busca && <Button icon={Plus} onClick={() => setModal({ tipo: 'form' })}>Adicionar setor</Button>}>
          {busca ? 'Ajuste o filtro para ver outros setores.' : 'Adicione o primeiro setor para começar a controlar os equipamentos.'}</EmptyState></div>
      ) : (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))' }}>
          {lista.map((i) => (
            <div key={i.id} className="card" role="button" tabIndex={0} style={{ cursor: 'pointer' }}
              onClick={() => setModal({ tipo: 'detalhe', id: i.id })}
              onKeyDown={(e) => e.key === 'Enter' && setModal({ tipo: 'detalhe', id: i.id })}>
              <div className="row" style={{ marginBottom: 12 }}>
                <MapPin size={16} style={{ color: 'var(--blue)', flex: 'none' }} />
                <strong style={{ flex: 1, minWidth: 0 }}>{i.setor || '—'}</strong>
                <Badge tone="blue">{totalSetor(i)} equip.</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {TIPOS.map((t) => (
                  <div key={t.id} title={t.label} style={{ textAlign: 'center', background: 'var(--card-2)', borderRadius: 10, padding: '8px 4px' }}>
                    <t.icon size={14} className="muted" />
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{num(i[t.id])}</div>
                    <div className="muted" style={{ fontSize: 10 }}>{t.curto}</div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <IconButton icon={Pencil} label="Editar" onClick={() => setModal({ tipo: 'form', id: i.id })} />
                <IconButton icon={Trash2} label="Excluir" onClick={() => excluir(i)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.tipo === 'form' && <InventarioForm key={modal.id || 'novo'} item={item} existentes={data} setores={setores} onClose={fechar} />}
      {modal?.tipo === 'detalhe' && item && (
        <DetalheModal item={item} onClose={fechar} podeExcluir
          onEditar={() => setModal({ tipo: 'form', id: item.id })} onExcluir={() => excluir(item)} />
      )}
    </div>
  );
}
