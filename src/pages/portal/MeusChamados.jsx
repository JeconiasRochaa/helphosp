import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Inbox, Lock, MessageSquare, Monitor, Wrench, Hospital } from 'lucide-react';
import { useMeusChamados } from '@/components/PortalShell';
import { EmptyState, Spinner, StatusPill, Tabs, Button } from '@/components/ui';
import { fmtData, fmtRelativo } from '@/lib/format';

export default function MeusChamados() {
  const { chamados, loading, erro } = useMeusChamados();
  const [aba, setAba] = useState('abertos');
  const abertos = chamados.filter((c) => c.status !== 'Concluído');
  const concl = chamados.filter((c) => c.status === 'Concluído');
  const lista = aba === 'abertos' ? abertos : concl;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link to="/" className="row muted text-sm" style={{ textDecoration: 'none' }}><ArrowLeft size={14} /> Voltar</Link>
      <div className="card">
        <div className="row-wrap" style={{ marginBottom: 12 }}>
          <div><h2 style={{ fontSize: 18 }}>Meus chamados</h2><p className="muted text-sm">Somente os chamados abertos neste aparelho.</p></div>
          <span className="spacer" />
          <Tabs value={aba} onChange={setAba} tabs={[{ id: 'abertos', label: 'Em aberto', count: abertos.length }, { id: 'concluidos', label: 'Concluídos', count: concl.length }]} />
        </div>
        <div className="aviso-device" style={{ marginBottom: 14 }}><Lock size={15} style={{ flex: 'none', marginTop: 2 }} />Por privacidade, chamados de outras pessoas não aparecem aqui. Se você limpar os dados do navegador, perderá o acesso a esta lista — anote o protocolo.</div>
        {loading ? <Spinner label="Carregando seus chamados…" /> : erro ? (
          <EmptyState title="Não foi possível carregar" action={<Button variant="outline" onClick={() => location.reload()}>Tentar de novo</Button>}>Verifique sua conexão e tente novamente.</EmptyState>
        ) : lista.length === 0 ? (
          <EmptyState icon={Inbox} title={aba === 'abertos' ? 'Nenhum chamado em aberto' : 'Nenhum chamado concluído'} action={aba === 'abertos' && <Link className="btn btn-primary" to="/">Abrir um chamado</Link>}>Os chamados que você abrir neste aparelho aparecerão aqui.</EmptyState>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {lista.map((c) => {
              const Icon = c.tipo === 'gesthosp' ? Hospital : c.departamento === 'MANUTENCAO' ? Wrench : Monitor;
              return (
                <Link key={c.id} to={`/meus-chamados/${c.id}`} className={'chamado-card' + (c.status === 'Concluído' ? ' concluido' : '')}>
                  {c.fotos?.[0] && <img className="thumb" src={c.fotos[0]} alt="" loading="lazy" />}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <strong className="row" style={{ gap: 7 }}><Icon size={15} color="var(--blue)" />{c.titulo || 'Sem título'}</strong>
                    <small className="muted">{c.protocolo} · {c.setor} · {fmtData(c.data_abertura)} · atualizado {fmtRelativo(c.data_atualizacao || c.data_abertura)}
                      {c.fotos?.length > 0 && <> · <Camera size={11} style={{ verticalAlign: -1 }} /> {c.fotos.length}</>}
                      {c.qtd_comentarios_publicos > 0 && <> · <MessageSquare size={11} style={{ verticalAlign: -1 }} /> {c.qtd_comentarios_publicos}</>}</small>
                  </div>
                  <StatusPill status={c.status} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
