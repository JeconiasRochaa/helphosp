import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

/**
 * Ordenação de tabelas por coluna.
 *   const { linhas, th } = useOrdenacao(lista, GETTERS, { chave: 'data', dir: 'desc' });
 *   <thead><tr>{th('data', 'Data')}</tr></thead>
 * `getters` mapeia chave -> função que devolve número ou texto (deve ser uma constante de módulo).
 */
export function useOrdenacao(lista, getters, inicial = { chave: null, dir: 'asc' }) {
  const [ord, setOrd] = useState(inicial);

  const linhas = useMemo(() => {
    const g = ord.chave && getters[ord.chave];
    if (!g) return lista;
    const m = ord.dir === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      const x = g(a), y = g(b);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * m;
      return String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR', { numeric: true }) * m;
    });
  }, [lista, getters, ord]);

  const alternar = (chave) => setOrd((o) => (o.chave === chave ? { chave, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { chave, dir: 'asc' }));

  const th = (chave, rotulo, props = {}) => {
    const ativo = ord.chave === chave;
    const Icone = !ativo ? ChevronsUpDown : ord.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th key={chave} className="ord" onClick={() => alternar(chave)} aria-sort={ativo ? (ord.dir === 'asc' ? 'ascending' : 'descending') : 'none'} {...props}>
        <span className="row" style={{ gap: 5 }}>{rotulo}<Icone size={12} style={{ opacity: ativo ? 1 : .4 }} /></span>
      </th>
    );
  };
  return { linhas, th, ord };
}
