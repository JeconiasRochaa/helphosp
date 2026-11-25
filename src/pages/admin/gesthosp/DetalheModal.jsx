import { useEffect, useState } from 'react';
import { Copy, Check, ShieldAlert, Trash2, ArrowRightCircle, UserRound, MapPin, Stethoscope } from 'lucide-react';
import { Button, Modal, StatusBadge } from '@/components/ui';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';
import { fmtData } from '@/lib/format';
import { STATUS_FLUXO } from '@/lib/constants';
import { SECOES, fmtDataNasc, textoParaCopiar } from './helpers';

const ICONES = { pessoais: UserRound, endereco: MapPin, profissional: Stethoscope };

export default function DetalheModal({ chamado, dados, onClose, onAvancar, onExcluir, podeExcluir, ocupado }) {
  const [copiado, setCopiado] = useState(false);
  const id = chamado.id;

  // LGPD: toda abertura de dados pessoais fica registrada.
  useEffect(() => {
    audit('gesthosp.visualizar', { protocolo: chamado.protocolo, chamado: id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoParaCopiar(chamado, dados));
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
      audit('gesthosp.copiar', { protocolo: chamado.protocolo });
      notify.success('Dados copiados para a área de transferência.');
    } catch { notify.error('Não foi possível copiar. Selecione o texto manualmente.'); }
  };

  const proximo = STATUS_FLUXO[chamado.status || 'A Fazer'];
  const timeline = Array.isArray(chamado.timeline) ? chamado.timeline : [];

  return (
    <Modal title={`Cadastro ${chamado.protocolo || ''}`} icon={ShieldAlert} onClose={onClose} width={760}
      footer={<>
        {podeExcluir && <Button variant="danger" icon={Trash2} onClick={onExcluir} disabled={ocupado}>Excluir</Button>}
        <span className="spacer" />
        <Button variant="outline" icon={copiado ? Check : Copy} onClick={copiar}>{copiado ? 'Copiado' : 'Copiar dados'}</Button>
        {proximo && <Button icon={ArrowRightCircle} loading={ocupado} onClick={onAvancar}>Avançar para "{proximo}"</Button>}
      </>}>
      <div className="stack">
        <div className="lgpd-box"><ShieldAlert size={16} style={{ flex: 'none' }} />
          <span>Dados pessoais protegidos pela LGPD. Esta visualização foi registrada na auditoria. Use as informações somente para efetivar o cadastro e não as compartilhe por canais não oficiais.</span>
        </div>
        <div className="row-wrap">
          <StatusBadge status={chamado.status} />
          <span className="muted text-sm">Aberto em {fmtData(chamado.data_abertura)}</span>
          {chamado.tecnico && <span className="muted text-sm">· Responsável: {chamado.tecnico}</span>}
        </div>
        {SECOES.map((s) => {
          const Icon = ICONES[s.id];
          const campos = s.campos.filter(([k]) => k !== 'observacoes' || dados[k]);
          return (
            <section key={s.id} className="card" style={{ boxShadow: 'none' }}>
              <div className="card-title"><Icon size={16} /><span>{s.titulo}</span></div>
              <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))' }}>
                {campos.map(([k, rot]) => (
                  <div key={k}>
                    <small className="muted text-xs" style={{ textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{rot}</small>
                    <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{(k === 'dataNascimento' ? fmtDataNasc(dados[k]) : dados[k]) || '—'}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {timeline.length > 0 && (
          <section>
            <div className="card-title">Histórico do cadastro</div>
            <div className="timeline">
              {timeline.slice().reverse().map((t, i) => (
                <div key={i} className={`tl-item${t.status === 'Concluído' ? ' fim' : ''}`}>
                  <time>{fmtData(t.data)}</time><span className="text-sm">{t.acao}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
