import { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Button, Field, Modal } from '@/components/ui';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { TIPOS, mesmoSetor, num } from './helpers';

const MAX = 99999;

/** Criar/editar o inventário de um setor. `item` = doc existente (edição) ou null. */
export default function InventarioForm({ item, existentes, setores, onClose }) {
  const [setor, setSetor] = useState(item?.setor || '');
  const [vals, setVals] = useState(() => Object.fromEntries(TIPOS.map((t) => [t.id, String(num(item?.[t.id]))])));
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const opcoes = setor && !setores.includes(setor) ? [setor, ...setores] : setores;

  const validar = () => {
    const e = {};
    if (!setor) e.setor = 'Selecione o setor.';
    else if (existentes.some((x) => x.id !== item?.id && mesmoSetor(x.setor, setor))) e.setor = 'Este setor já possui inventário. Edite o registro existente.';
    TIPOS.forEach((t) => {
      const raw = String(vals[t.id]).trim();
      if (raw === '') return;
      if (!/^\d+$/.test(raw)) e[t.id] = 'Use apenas números inteiros.';
      else if (Number(raw) > MAX) e[t.id] = `Máximo ${MAX}.`;
    });
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    if (!validar()) return;
    const dados = { setor, ...Object.fromEntries(TIPOS.map((t) => [t.id, num(vals[t.id])])) };
    setSalvando(true);
    try {
      if (item) {
        await updateDoc(doc(db, 'inventario', item.id), dados);
        audit('inventario.editar', { setor, antes: Object.fromEntries(TIPOS.map((t) => [t.id, num(item[t.id])])), depois: dados });
      } else {
        await addDoc(collection(db, 'inventario'), dados);
        audit('inventario.criar', { setor, ...dados });
      }
      notify.success(item ? 'Inventário atualizado.' : 'Setor adicionado ao inventário.');
      onClose();
    } catch (e) { console.error(e); notify.error('Não foi possível salvar o inventário.'); setSalvando(false); }
  };

  return (
    <Modal title={item ? 'Editar inventário' : 'Novo setor no inventário'} onClose={onClose} width={560}
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button icon={Save} type="submit" form="form-inventario" loading={salvando}>Salvar</Button>
      </>}>
      <form id="form-inventario" className="stack" onSubmit={salvar} noValidate>
        <Field label="Setor" required error={erros.setor}>
          <select className="select" value={setor} onChange={(e) => setSetor(e.target.value)} autoFocus>
            <option value="">Selecione...</option>
            {opcoes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
          {TIPOS.map((t) => (
            <Field key={t.id} label={t.label} error={erros[t.id]}>
              <input className="input" type="number" inputMode="numeric" min="0" max={MAX} step="1" value={vals[t.id]}
                onChange={(e) => setVals((v) => ({ ...v, [t.id]: e.target.value }))} onFocus={(e) => e.target.select()} />
            </Field>
          ))}
        </div>
      </form>
    </Modal>
  );
}
