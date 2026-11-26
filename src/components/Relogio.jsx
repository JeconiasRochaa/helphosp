import { useEffect, useState } from 'react';

/** Relógio grande ao lado da data. `tamanho`: 'md' (cabeçalho de página) | 'xl' (painel TV). */
export default function Relogio({ tamanho = 'md', className = '' }) {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 1000); return () => clearInterval(t); }, []);
  const hm = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const s = String(agora.getSeconds()).padStart(2, '0');
  return (
    <div className={`relogio ${tamanho} ${className}`} role="timer" aria-label={`Agora são ${hm}`}>
      <div className="rl-hora"><b>{hm}</b><small>:{s}</small></div>
      <div className="rl-data">
        <strong>{agora.toLocaleDateString('pt-BR', { weekday: 'long' })}</strong>
        <span>{agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  );
}
