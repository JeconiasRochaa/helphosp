import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const MAX_LADO = 1600;
const QUALIDADE = 0.82;
export const FOTO_MAX_BYTES = 10 * 1024 * 1024;

/** Reduz a imagem no navegador antes do envio (economiza dados e acelera o painel). */
export function comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Arquivo não é uma imagem'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        const escala = Math.min(1, MAX_LADO / Math.max(width, height));
        width = Math.round(width * escala); height = Math.round(height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Falha ao processar imagem'));
          resolve({ blob, width, height, preview: URL.createObjectURL(blob), nome: file.name });
        }, 'image/jpeg', QUALIDADE);
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem')); };
    img.src = url;
  });
}

/**
 * Envia imagens já comprimidas ({blob}) para uma pasta do Storage.
 * Retorna as URLs. onProgress recebe 0–100.
 */
let storageIndisponivel = false;

/** Reduz uma imagem e devolve um data URL JPEG pequeno (modo compatível, guardado no Firestore). */
function blobParaDataUrlPequeno(blob, maxLado = 1000, qualidade = 0.6) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob); const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, maxLado / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
    img.src = url;
  });
}

/**
 * Envia fotos. Tenta o Firebase Storage; se ele estiver indisponível (não criado, sem permissão, plano),
 * guarda uma versão reduzida da foto direto no documento (data URL) para a anexação nunca falhar.
 */
export async function enviarImagens(itens, pasta, onProgress) {
  if (!storageIndisponivel) {
    try { return await enviarImagensStorage(itens, pasta, onProgress); }
    catch (e) {
      console.warn('Storage indisponível, usando modo compatível:', e?.code || e);
      if (/unauthorized|unauthenticated|retry-limit|bucket|quota|canceled|unknown|object-not-found/.test(e?.code || '')) storageIndisponivel = true;
      else throw e;
    }
  }
  const out = [];
  for (let i = 0; i < itens.length; i++) { out.push(await blobParaDataUrlPequeno(itens[i].blob)); onProgress?.(Math.round(((i + 1) / itens.length) * 100)); }
  return out;
}

async function enviarImagensStorage(itens, pasta, onProgress) {
  const urls = [];
  const total = itens.length;
  for (let i = 0; i < total; i++) {
    const r = ref(storage, `${pasta}/${Date.now()}_${i + 1}.jpg`);
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(r, itens[i].blob, { contentType: 'image/jpeg' });
      task.on('state_changed',
        (s) => onProgress?.(Math.round(((i + (s.bytesTransferred / (s.totalBytes || 1))) / total) * 100)),
        reject,
        async () => { try { urls.push(await getDownloadURL(task.snapshot.ref)); resolve(); } catch (e) { reject(e); } });
    });
  }
  onProgress?.(100);
  return urls;
}

/** Envia arquivos quaisquer (sem compressão) — usado em Arquivos/logos. */
export async function enviarArquivo(file, caminho, onProgress) {
  const r = ref(storage, caminho);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(r, file, { contentType: file.type || 'application/octet-stream' });
    task.on('state_changed',
      (s) => onProgress?.(Math.round((s.bytesTransferred / (s.totalBytes || 1)) * 100)),
      reject,
      async () => { try { resolve({ url: await getDownloadURL(task.snapshot.ref), caminho }); } catch (e) { reject(e); } });
  });
}
