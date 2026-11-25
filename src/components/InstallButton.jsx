import { Download } from 'lucide-react';
import { useInstalar } from '@/lib/pwa';
import { notify } from '@/lib/notify';

/** Botão "Instalar app". Só aparece quando a instalação é possível. `variante`: 'link' | 'menu' */
export default function InstallButton({ variante = 'link', className = '', onDone }) {
  const { disponivel, instalar } = useInstalar();
  if (!disponivel) return null;
  async function clicar() {
    const r = await instalar();
    if (r === 'ios') notify.alert('No Safari, toque em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".', { titulo: 'Instalar o HelpHosp', variante: 'info' });
    onDone?.();
  }
  return (
    <button type="button" className={variante === 'menu' ? `um-item ${className}` : `link-discreto ${className}`} onClick={clicar}>
      <Download size={variante === 'menu' ? 16 : 12} /> Instalar app
    </button>
  );
}
