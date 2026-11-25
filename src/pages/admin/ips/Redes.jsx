import { useMemo, useState } from 'react';
import { AlertTriangle, Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import { useIpam, detectarConflitos, estatisticasRede, mapaBloco, qtdBlocos, parseCIDR, salvarRede, excluirRede } from '@/lib/ipam';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Spinner } from '@/components/ui';
import DispositivoModal from './DispositivoModal';
import { isIPv4 } from '@/lib/validators';
import { notify } from '@/lib/notify';

const COR = { livre: ['var(--green-bg)', 'var(--green-fg)'], uso: ['var(--blue)', '#fff'], reservado: ['var(--warning)', '#fff'], inativo: ['var(--muted)', '#fff'], gateway: ['var(--purple)', '#fff'], dhcp: ['var(--teal)', '#fff'], conflito: ['var(--danger)', '#fff'], 'reservado-rede': ['var(--gray-bg)', 'var(--muted)'], fora: ['transparent', 'transparent'] };
const ROT = { livre: 'Livre', uso: 'Em uso', reservado: 'Reservado', inativo: 'Inativo', gateway: 'Gateway', dhcp: 'Faixa DHCP', conflito: 'Conflito', 'reservado-rede': 'Rede/broadcast' };

export default function IpsRedes() {
  const { dispositivos, redes, loading } = useIpam();
  const { perfil } = useAuth();
  const [editar, setEditar] = useState(null); const [modalDisp, setModalDisp] = useState(null); const [sel, setSel] = useState(null);
  const conf = useMemo(() => detectarConflitos(dispositivos, redes), [dispositivos, redes]);

  async function excluir(r) { if (await notify.confirm(`A sub-rede “${r.nome}” será excluída. Os dispositivos não são apagados.`, { titulo: 'Excluir sub-rede', confirmar: 'Excluir' })) excluirRede(r).then(() => notify.success('Sub-rede excluída.')).catch(() => notify.error('Falha ao excluir.')); }
  const rede = redes.find((r) => r.id === sel) || redes[0];

  return (
    <>
      <PageHeader icon={Globe} title="Sub-redes e mapa de IPs" subtitle="Utilização, mapa visual e conflitos" actions={<Button size="sm" icon={Plus} onClick={() => setEditar({})}>Nova sub-rede</Button>} />
      {loading ? <Spinner /> : (
        <div className="stack" style={{ gap: 18 }}>
          {(conf.ipDup.length > 0 || conf.macDup.length > 0 || conf.foraDeRede.length > 0) && (
            <Card title="Conflitos e inconsistências" icon={AlertTriangle}>
              <div className="stack" style={{ gap: 8 }}>
                {conf.ipDup.map(([ip, l]) => <div key={ip} className="row-wrap"><Badge tone="red">IP duplicado</Badge><code>{ip}</code><span className="text-sm">{l.map((d) => d.dispositivo).join(' · ')}</span></div>)}
                {conf.macDup.map(([mac, l]) => <div key={mac} className="row-wrap"><Badge tone="red">MAC duplicado</Badge><code>{mac}</code><span className="text-sm">{l.map((d) => d.dispositivo).join(' · ')}</span></div>)}
                {conf.foraDeRede.length > 0 && <div className="row-wrap"><Badge tone="amber">Fora de qualquer sub-rede</Badge><span className="text-sm">{conf.foraDeRede.slice(0, 8).map((d) => `${d.dispositivo} (${d.ip})`).join(' · ')}{conf.foraDeRede.length > 8 && ` +${conf.foraDeRede.length - 8}`}</span></div>}
              </div>
            </Card>
          )}
          {redes.length === 0 ? <div className="card"><EmptyState icon={Globe} title="Nenhuma sub-rede cadastrada" action={<Button icon={Plus} onClick={() => setEditar({})}>Cadastrar sub-rede</Button>}>Cadastre as faixas da rede (ex.: 192.168.1.0/24) para ver utilização e o mapa de IPs.</EmptyState></div> : (
            <>
              <div className="grid-auto">{redes.map((r) => {
                const e = estatisticasRede(r, dispositivos);
                return (
                  <div key={r.id} className="card" style={{ cursor: 'pointer', borderColor: rede?.id === r.id ? 'var(--blue)' : undefined }} onClick={() => setSel(r.id)}>
                    <div className="row"><div style={{ flex: 1 }}><strong>{r.nome}</strong><div className="mono text-sm muted">{r.cidr}{r.vlan && ` · VLAN ${r.vlan}`}</div></div>
                      <Button variant="ghost" size="sm" icon={Pencil} onClick={(ev) => { ev.stopPropagation(); setEditar(r); }} /><Button variant="ghost" size="sm" icon={Trash2} onClick={(ev) => { ev.stopPropagation(); excluir(r); }} /></div>
                    {e && <><div className="progress" style={{ margin: '12px 0 6px' }}><div style={{ width: e.pct + '%', background: e.pct > 90 ? 'var(--danger)' : e.pct > 75 ? 'var(--warning)' : undefined }} /></div>
                      <div className="row text-sm" style={{ justifyContent: 'space-between' }}><span>{e.usados} de {e.total} em uso ({e.pct}%)</span><span className="muted">{e.livres} livres</span></div></>}
                    {r.descricao && <div className="text-xs muted" style={{ marginTop: 6 }}>{r.descricao}</div>}
                  </div>);
              })}</div>
              {rede && <Mapa rede={rede} dispositivos={dispositivos} conflitos={conf.idsEmConflito} onNovo={(ip) => setModalDisp({ inicial: { ip, rede: rede.id } })} onAbrir={(d) => setModalDisp({ d })} />}
            </>
          )}
        </div>
      )}
      {editar && <RedeModal rede={editar} perfil={perfil} onClose={() => setEditar(null)} />}
      {modalDisp && <DispositivoModal dispositivo={modalDisp.d} inicial={modalDisp.inicial} dispositivos={dispositivos} redes={redes} onClose={() => setModalDisp(null)} />}
    </>
  );
}

function Mapa({ rede, dispositivos, conflitos, onNovo, onAbrir }) {
  const [bloco, setBloco] = useState(0); const [hover, setHover] = useState(null);
  const n = qtdBlocos(rede); const b = Math.min(bloco, n - 1);
  const cells = useMemo(() => mapaBloco(rede, dispositivos, b, conflitos), [rede, dispositivos, b, conflitos]);
  const prefix = cells[0]?.ip.split('.').slice(0, 3).join('.');
  return (
    <Card title={`Mapa de IPs — ${rede.nome}`} icon={Globe} actions={n > 1 && <select className="select" style={{ width: 'auto' }} value={b} onChange={(e) => setBloco(+e.target.value)}>{Array.from({ length: Math.min(n, 256) }, (_, i) => <option key={i} value={i}>{mapaBloco(rede, [], i)[0].ip.replace(/\.0$/, '.x')}</option>)}</select>}>
      <div className="row-wrap text-xs" style={{ marginBottom: 10 }}>{Object.entries(ROT).map(([k, v]) => <span key={k} className="row" style={{ gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: COR[k][0], border: '1px solid var(--border)' }} />{v}</span>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(0,1fr))', gap: 3 }}>
        {cells.map((c) => c.estado === 'fora' ? <span key={c.i} /> : (
          <button key={c.i} type="button" aria-label={`${c.ip} — ${ROT[c.estado]}${c.disp ? ' — ' + c.disp.dispositivo : ''}`}
            onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(c)}
            onClick={() => (c.disp ? onAbrir(c.disp) : ['livre', 'dhcp'].includes(c.estado) && onNovo(c.ip))}
            style={{ aspectRatio: '1', border: 0, borderRadius: 4, fontSize: 9.5, fontFamily: 'var(--mono)', background: COR[c.estado][0], color: COR[c.estado][1], cursor: c.disp || ['livre', 'dhcp'].includes(c.estado) ? 'pointer' : 'default', padding: 0 }}>{c.i}</button>
        ))}
      </div>
      <div className="text-sm" style={{ minHeight: 40, marginTop: 10 }}>
        {hover ? <><code>{hover.ip}</code> — <strong>{ROT[hover.estado]}</strong>{hover.disp && <> · {hover.disp.dispositivo} ({hover.disp.setor})</>}{hover.estado === 'livre' && <span className="muted"> · clique para cadastrar</span>}</> : <span className="muted">Passe o mouse sobre uma célula ({prefix}.x). Clique em um IP livre para cadastrar ou em um ocupado para abrir.</span>}
      </div>
    </Card>
  );
}

function RedeModal({ rede, perfil, onClose }) {
  const edicao = !!rede.id;
  const [f, setF] = useState({ nome: '', cidr: '', gateway: '', vlan: '', descricao: '', setorPrincipal: '', dhcpInicio: '', dhcpFim: '', ...rede });
  const [er, setEr] = useState({}); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function salvar(e) {
    e.preventDefault(); const x = {}; const info = parseCIDR(f.cidr);
    if (!f.nome.trim()) x.nome = 'Obrigatório.'; if (!info) x.cidr = 'CIDR inválido (ex.: 192.168.1.0/24; prefixos /16 a /30).';
    ['gateway', 'dhcpInicio', 'dhcpFim'].forEach((k) => { if (f[k] && !isIPv4(f[k])) x[k] = 'IPv4 inválido.'; });
    if (info && f.gateway && isIPv4(f.gateway) && (parseCIDR(f.cidr) && !(f.gateway.split('.').length === 4))) x.gateway = 'Inválido.';
    setEr(x); if (Object.keys(x).length) return; setBusy(true);
    try { const { id, fid, ...dados } = f; await salvarRede({ ...dados, nome: f.nome.trim(), cidr: `${info.redeStr}/${info.prefixo}` }, edicao ? rede : null, perfil); notify.success('Sub-rede salva.', { som: false }); onClose(); }
    catch (err) { console.error(err); notify.error('Não foi possível salvar.'); setBusy(false); }
  }
  return (
    <Modal title={edicao ? 'Editar sub-rede' : 'Nova sub-rede'} icon={Globe} onClose={onClose} width={560} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar</Button></>}>
      <form className="stack" onSubmit={salvar} noValidate>
        <div className="form-row"><Field label="Nome" required error={er.nome}><input className="input" value={f.nome} onChange={set('nome')} placeholder="Ex.: Administrativo" /></Field><Field label="CIDR" required error={er.cidr}><input className="input mono" value={f.cidr} onChange={set('cidr')} placeholder="192.168.1.0/24" /></Field></div>
        <div className="form-row"><Field label="Gateway" error={er.gateway}><input className="input mono" value={f.gateway} onChange={set('gateway')} /></Field><Field label="VLAN"><input className="input" value={f.vlan} onChange={set('vlan')} /></Field></div>
        <div className="form-row"><Field label="Início da faixa DHCP" error={er.dhcpInicio}><input className="input mono" value={f.dhcpInicio} onChange={set('dhcpInicio')} /></Field><Field label="Fim da faixa DHCP" error={er.dhcpFim}><input className="input mono" value={f.dhcpFim} onChange={set('dhcpFim')} /></Field></div>
        <Field label="Descrição"><textarea className="textarea" rows={2} value={f.descricao} onChange={set('descricao')} /></Field>
      </form>
    </Modal>
  );
}
