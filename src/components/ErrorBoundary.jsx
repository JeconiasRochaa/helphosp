import { Component } from 'react';

/** Evita tela branca: mostra o erro (e permite recarregar / limpar o cache do app). */
export default class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { erro: null }; }
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidCatch(erro, info) { console.error('Erro de interface:', erro, info?.componentStack); }
  async limpar() {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((regs || []).map((r) => r.unregister()));
      const ks = await caches?.keys?.();
      await Promise.all((ks || []).map((k) => caches.delete(k)));
    } catch { /* */ }
    location.reload();
  }
  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    return (
      <div style={{ maxWidth: 640, margin: '10vh auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ margin: 0 }}>Algo deu errado ao carregar esta tela</h2>
        <p style={{ color: '#64748b' }}>Tente recarregar. Se continuar, envie o texto abaixo ao suporte.</p>
        <pre style={{ background: '#0f172a', color: '#fca5a5', padding: 14, borderRadius: 10, whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(erro?.stack || erro?.message || erro).slice(0, 1200)}</pre>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => location.reload()}>Recarregar</button>
          <button className="btn" onClick={() => this.limpar()}>Limpar cache do app e recarregar</button>
        </div>
      </div>
    );
  }
}
