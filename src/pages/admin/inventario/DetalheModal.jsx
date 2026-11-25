import { Pencil, Trash2, MapPin } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { TIPOS, num, totalSetor } from './helpers';

export default function DetalheModal({ item, onClose, onEditar, onExcluir, podeExcluir }) {
  return (
    <Modal title={item.setor} icon={MapPin} onClose={onClose} width={560}
      footer={<>
        {podeExcluir && <Button variant="danger" icon={Trash2} onClick={onExcluir}>Excluir</Button>}
        <span className="spacer" />
        <Button icon={Pencil} onClick={onEditar}>Editar</Button>
      </>}>
      <p className="muted" style={{ marginBottom: 12 }}>{totalSetor(item)} equipamento(s) neste setor</p>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
        {TIPOS.map((t) => (
          <div key={t.id} className="stat-card">
            <div className={`stat-icon tone-${t.tone}`}><t.icon size={22} /></div>
            <div><small>{t.label}</small><strong>{num(item[t.id])}</strong></div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
