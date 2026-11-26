import { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { isoDia, isoMes, turnoDe, useEscalaMes, useProfissionais } from '@/lib/escala';

/**
 * Escolha de quem vai executar o serviço (Manutenção). Mostra primeiro quem está na escala de HOJE.
 *   value: [{ id, nome }]   onChange(novaLista)
 */
export default function SeletorExecutores({ dep, value = [], onChange }) {
  const { data: profs, loading } = useProfissionais(dep);
  const { data: esc } = useEscalaMes(dep, isoMes());
  const hoje = isoDia();
  const naEscala = useMemo(() => { const m = {}; esc.filter((e) => e.data === hoje).forEach((e) => { (m[e.profissionalId] ||= []).push(e.turno); }); return m; }, [esc, hoje]);
  const ativos = profs.filter((p) => p.ativo !== false).sort((a, b) => (!!naEscala[b.id] - !!naEscala[a.id]) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const marcado = (id) => value.some((v) => v.id === id);
  const alt = (p) => onChange(marcado(p.id) ? value.filter((v) => v.id !== p.id) : [...value, { id: p.id, nome: p.nome }]);
  if (loading) return <span className="muted text-sm">Carregando profissionais…</span>;
  if (!ativos.length) return <span className="muted text-sm">Nenhum profissional cadastrado. Cadastre em "Profissionais" no menu.</span>;
  return (
    <div className="chips-sel">
      {ativos.map((p) => (
        <button type="button" key={p.id} className={marcado(p.id) ? 'on' : ''} onClick={() => alt(p)} title={naEscala[p.id] ? `Na escala hoje: ${naEscala[p.id].join(', ')}` : 'Fora da escala hoje'}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{p.nome}{naEscala[p.id] && <CalendarCheck size={12} />}</span>
          <small>{p.funcao || 'Profissional'}{naEscala[p.id] ? ` · hoje: ${turnoDe(naEscala[p.id][0]).id}` : ''}</small>
        </button>
      ))}
    </div>
  );
}
