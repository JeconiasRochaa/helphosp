import { useEffect, useState } from 'react';

/**
 * Instalação do app (PWA).
 *  • Chrome/Edge/Android: captura `beforeinstallprompt` e oferece o botão "Instalar".
 *  • iOS (Safari): não existe prompt; mostramos o passo a passo (Compartilhar → Adicionar à Tela de Início).
 */
let evento = null;
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e; avisar(); });
  window.addEventListener('appinstalled', () => { evento = null; avisar(); });
}

export const instalado = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
export const ehIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export function useInstalar() {
  const [, forca] = useState(0);
  useEffect(() => { const f = () => forca((n) => n + 1); ouvintes.add(f); return () => ouvintes.delete(f); }, []);
  const ios = ehIOS();
  const ja = instalado();
  return {
    // true quando vale a pena mostrar o botão
    disponivel: !ja && (!!evento || ios),
    ios, instalado: ja,
    async instalar() {
      if (evento) { evento.prompt(); try { await evento.userChoice; } catch { /* */ } evento = null; avisar(); return; }
      return 'ios';
    }
  };
}
