import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import { Badge, Button, Field, Modal } from '@/components/ui';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import { ATRIBUICOES, STATUS, TIPOS, parseCIDR, proximoIpLivre, redeDoIp, salvarDispositivo, validarDuplicidade, tipoRotulo } from '@/lib/ipam';
import { isIPv4, isMAC, normalizarMAC, ipNaRede } from '@/lib/validators';
import { notify } from '@/lib/notify';

export default function DispositivoModal({ dispositivo, inicial, dispositivos, redes, onClose }) {
  const { perfil } = useAuth(); const { setores } = useConfig();
  const edicao = !!dispositivo?.id;
  const [f, setF] = useState({ dispositivo: '', tipo: '', ip: '', mac: '', setor: '', localizacao: '', status: 'Ativo', atribuicao: 'Estático', hostname: '', vlan: '', responsavel: '', observacao: '', rede: '', ...(dispositivo || {}), ...(inicial || {}) });
  const [er, setEr] = useState({}); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const rede = redes.find((r) => r.id === f.rede);
  const aviso = useMemo(() => { const i = parseCIDR(rede?.cidr); return isIPv4(f.ip) && i && !ipNaRede(f.ip, i) ? `O IP não pertence à sub-rede ${rede.cidr}.` : (!rede && isIPv4(f.ip) && redes.length && !redeDoIp(f.ip, redes) ? 'Este IP não pertence a nenhuma sub-rede cadastrada.' : null); }, [f.ip, rede, redes]);
  const sugerir = () => { const ip = proximoIpLivre(rede, dispositivos.filter((d) => d.id !== dispositivo?.id)); if (ip) setF((s) => ({ ...s, ip })); else notify.warning('Sem IP livre nesta sub-rede.'); };

  async function salvar(e) {
    e.preventDefault(); const x = {};
    if (!f.dispositivo.trim()) x.dispositivo = 'Obrigatório.'; if (!f.tipo) x.tipo = 'Selecione.'; if (!f.setor) x.setor = 'Selecione.';
    if (!isIPv4(f.ip)) x.ip = 'Informe um IPv4 válido (ex.: 192.168.0.10).';
    if (f.mac.trim() && !isMAC(normalizarMAC(f.mac))) x.mac = 'MAC inválido (ex.: 00:1A:2B:3C:4D:5E).';
    if (!x.ip) { const d = validarDuplicidade({ ip: f.ip, mac: f.mac }, dispositivos, dispositivo?.id); if (d) x[d.campo] = d.msg; }
    setEr(x); if (Object.keys(x).length) return;
    setBusy(true);
    try { const { id, fid, ...dados } = f; await salvarDispositivo({ ...dados, dispositivo: f.dispositivo.trim(), ip: f.ip.trim(), mac: f.mac.trim() ? normalizarMAC(f.mac) : '' }, edicao ? dispositivo : null, perfil); notify.success('Dispositivo salvo.', { som: false }); onClose(); }
    catch (err) { console.error(err); notify.error('Não foi possível salvar.'); setBusy(false); }
  }
  return (
    <Modal title={edicao ? 'Editar dispositivo' : 'Novo dispositivo'} icon={Network} onClose={onClose} width={700}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={salvar}>Salvar dispositivo</Button></>}>
      <form className="stack" onSubmit={salvar} noValidate>
        <div className="form-row"><Field label="Nome do dispositivo" required error={er.dispositivo}><input className="input" value={f.dispositivo} onChange={set('dispositivo')} placeholder="Ex.: Computador Recepção" /></Field>
          <Field label="Tipo" required error={er.tipo}><select className="select" value={f.tipo} onChange={set('tipo')}><option value="">Selecione…</option>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field></div>
        <div className="form-row"><Field label="Sub-rede"><select className="select" value={f.rede || ''} onChange={set('rede')}><option value="">— não definida —</option>{redes.map((r) => <option key={r.id} value={r.id}>{r.nome} ({r.cidr})</option>)}</select></Field>
          <Field label="Atribuição"><select className="select" value={f.atribuicao} onChange={set('atribuicao')}>{ATRIBUICOES.map((a) => <option key={a}>{a}</option>)}</select></Field></div>
        <div className="form-row">
          <Field label="Endereço IP" required error={er.ip} hint={aviso && <span style={{ color: 'var(--amber-fg)' }}>{aviso}</span>}>
            <div className="row" style={{ gap: 6 }}><input className="input mono" value={f.ip} onChange={set('ip')} placeholder="192.168.0.10" />{rede && <Button size="sm" variant="outline" onClick={sugerir} title="Próximo IP livre">Sugerir</Button>}</div></Field>
          <Field label="MAC Address" error={er.mac}><input className="input mono" value={f.mac} onChange={set('mac')} placeholder="00:1A:2B:3C:4D:5E" /></Field></div>
        <div className="form-row"><Field label="Setor" required error={er.setor}><select className="select" value={f.setor} onChange={set('setor')}><option value="">Selecione…</option>{[...new Set([...setores, f.setor].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Localização"><input className="input" value={f.localizacao} onChange={set('localizacao')} placeholder="Sala 101, rack 3…" /></Field></div>
        <div className="form-row"><Field label="Hostname"><input className="input mono" value={f.hostname} onChange={set('hostname')} /></Field><Field label="VLAN"><input className="input" value={f.vlan} onChange={set('vlan')} /></Field></div>
        <div className="form-row"><Field label="Status"><select className="select" value={f.status} onChange={set('status')}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Responsável"><input className="input" value={f.responsavel} onChange={set('responsavel')} /></Field></div>
        <Field label="Observação"><textarea className="textarea" rows={2} value={f.observacao} onChange={set('observacao')} /></Field>
        {f.tipo && <div className="text-xs muted">Tipo: <Badge tone="gray">{tipoRotulo(f.tipo)}</Badge></div>}
      </form>
    </Modal>
  );
}
