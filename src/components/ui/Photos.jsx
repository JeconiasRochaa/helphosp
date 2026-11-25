import { useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { comprimirImagem, FOTO_MAX_BYTES } from '@/lib/images';
import { notify } from '@/lib/notify';

/**
 * Seletor de fotos com compressão (câmera, galeria, arrastar e colar).
 *   const [fotos, setFotos] = useState([]);   // [{ blob, preview, nome }]
 *   <PhotoPicker value={fotos} onChange={setFotos} max={3} />
 * Envie depois com enviarImagens(fotos, 'chamados/<pasta>').
 */
export default function PhotoPicker({ value = [], onChange, max = 3, capture = true }) {
  const input = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const [lendo, setLendo] = useState(false);

  async function adicionar(files) {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    setLendo(true);
    const novas = [...value];
    for (const f of lista) {
      if (novas.length >= max) { notify.warning(`Limite de ${max} foto(s).`); break; }
      if (!f.type.startsWith('image/')) { notify.warning(`"${f.name}" não é uma imagem.`); continue; }
      if (f.size > FOTO_MAX_BYTES) { notify.warning(`"${f.name}" passa de 10 MB.`); continue; }
      try { novas.push(await comprimirImagem(f)); } catch { notify.error(`Não foi possível processar "${f.name}".`); }
    }
    onChange(novas); setLendo(false);
    if (input.current) input.current.value = '';
  }
  const remover = (i) => { URL.revokeObjectURL(value[i].preview); onChange(value.filter((_, k) => k !== i)); };

  return (
    <div onPaste={(e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); adicionar(fs); } }}>
      {value.length < max && (
        <div className={'dropzone' + (arrastando ? ' arrastando' : '')} onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }} onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }} tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}>
          {capture ? <Camera size={22} /> : <ImagePlus size={22} />}
          <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{lendo ? 'Processando...' : 'Tirar foto, escolher da galeria ou colar um print'}</div>
          <div className="text-xs">Até {max} foto(s) · comprimidas automaticamente</div>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => adicionar(e.target.files)} />
      {value.length > 0 && (
        <div className="fotos-grid" style={{ marginTop: 10 }}>
          {value.map((f, i) => (
            <div className="foto-thumb" key={i} onClick={() => notify.lightbox(value.map((x) => x.preview), i)}>
              <img src={f.preview} alt={`Foto ${i + 1}`} />
              <button type="button" className="del" aria-label="Remover foto" onClick={(e) => { e.stopPropagation(); remover(i); }}><X size={13} /></button>
              <div className="tam">{(f.blob.size / 1024).toFixed(0)} KB</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Galeria de URLs; clique abre o visualizador em tela cheia (com setas). */
export function PhotoGallery({ urls = [], titulo }) {
  const lista = urls.filter(Boolean);
  if (!lista.length) return null;
  return (
    <div>
      {titulo && <div className="label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={14} />{titulo} ({lista.length})</div>}
      <div className="fotos-grid">
        {lista.map((u, i) => (
          <button type="button" className="foto-thumb" key={u + i} onClick={() => notify.lightbox(lista, i)} aria-label={`Abrir foto ${i + 1}`}>
            <img src={u} alt={`Foto ${i + 1}`} loading="lazy" onError={(e) => { e.currentTarget.style.opacity = .25; }} />
          </button>
        ))}
      </div>
    </div>
  );
}
