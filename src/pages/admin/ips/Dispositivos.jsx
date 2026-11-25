import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCheck, Copy, Download, ExternalLink, FileText, LayoutGrid, Network, Pencil, Plus, Rows3, Trash2, Upload } from 'lucide-react';
import { useIpam, TIPOS, cmpIp, detectarConflitos, excluirDispositivo, importarDispositivos, marcarVerificado, tipoRotulo, CSV_COLUNAS, parseCSV, validarImportacao } from '@/lib/ipam';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { Badge, Button, EmptyState, Modal, PageHeader, SearchInput, Spinner, StatCard } from '@/components/ui';
import DispositivoModal from './DispositivoModal';
import { baixarArquivo, fmtData, paraCSV } from '@/lib/format';
import { notify } from '@/lib/notify';
import { ipParaInt } from '@/lib/validators';

const TOM = { Ativo: 'green', Inativo: 'red', Reservado: 'amber' };

export default function IpsDispositivos() {
  const { dispositivos, redes, loading } = useIpam();
  const { perfil } = useAuth(); const { setores, logos } = useConfig();
  const [busca, setBusca] = useState(''); const [fStatus, setFStatus] = useState(''); const [fTipo, setFTipo] = useState(''); const [fSetor, setFSetor] = useState(''); const [fRede, setFRede] = useState('');
  const [fConf, setFConf] = useState(false); const [ordem, setOrdem] = useState('ip'); const [vista, setVista] = useState('tabela');
  const [modal, setModal] = useState(null); const [imp, setImp] = useState(false);
  const conf = useMemo(() => detectarConflitos(dispositivos, redes), [dispositivos, redes]);
  const cont = (s) => dispositivos.filter((d) => (d.status || 'Ativo') === s).length;

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return dispositivos.filter((d) => (!fStatus || (d.status || 'Ativo') === fStatus) && (!fTipo || d.tipo === fTipo) && (!fSetor || d.setor === fSetor) && (!fRede || d.rede === fRede) && (!fConf || conf.idsEmConflito.has(d.id))
      && (!t || [d.dispositivo, d.ip, d.mac, d.setor, d.localizacao, d.hostname, d.responsavel].some((v) => String(v || '').toLowerCase().includes(t))))
      .sort(ordem === 'ip' ? cmpIp : (a, b) => String(a[ordem === 'nome' ? 'dispositivo' : 'setor'] || '').localeCompare(String(b[ordem === 'nome' ? 'dispositivo' : 'setor'] || ''), 'pt-BR'));
  }, [dispositivos, busca, fStatus, fTipo, fSetor, fRede, fConf, ordem, conf]);

  const copiar = (t) => { navigator.clipboard?.writeText(t); notify.success('Copiado.', { som: false }); };
  async function excluir(d) { if (await notify.confirm(`“${d.dispositivo}” (${d.ip}) será excluído. O histórico registra a remoção.`, { titulo: 'Excluir dispositivo', confirmar: 'Excluir' })) excluirDispositivo(d, perfil).then(() => notify.success('Dispositivo excluído.')).catch(() => notify.error('Falha ao excluir.')); }
  const csv = () => baixarArquivo('dispositivos-rede.csv', paraCSV(lista, CSV_COLUNAS.map((c) => ({ titulo: c, valor: c }))), 'text/csv;charset=utf-8');
  async function pdf() {
    try {
      notify.info('Gerando relatório…', { som: false });
      const { jsPDF } = await import('jspdf'); const pdf = new jsPDF('l', 'mm', 'a4'); let y = 18;
      if (logos.hospital) { try { pdf.addImage(logos.hospital, 'PNG', 10, 6, 0, 12); } catch { /* logo inválida */ } }
      pdf.setFontSize(16); pdf.text('HelpHosp — Relatório de rede', 148, y, { align: 'center' }); y += 7; pdf.setFontSize(9);
      pdf.text(`${new Date().toLocaleDateString('pt-BR')} · ${lista.length} dispositivo(s) · ${cont('Ativo')} ativos · ${conf.ipDup.length} conflito(s) de IP`, 148, y, { align: 'center' }); y += 8;
      const cols = [['Dispositivo', 10, 52], ['Tipo', 62, 28], ['IP', 90, 30], ['MAC', 120, 38], ['Setor', 158, 45], ['Local', 203, 50], ['Status', 253, 20]];
      const cab = () => { pdf.setFillColor(11, 35, 64); pdf.rect(10, y - 4, 277, 6, 'F'); pdf.setTextColor(255); cols.forEach(([n, x]) => pdf.text(n, x + 1, y)); pdf.setTextColor(0); y += 6; }; cab();
      lista.forEach((d, i) => { if (y > 195) { pdf.addPage(); y = 14; cab(); } if (i % 2) { pdf.setFillColor(243, 246, 251); pdf.rect(10, y - 4, 277, 5.5, 'F'); }
        [d.dispositivo, tipoRotulo(d.tipo), d.ip, d.mac, d.setor, d.localizacao, d.status].forEach((v, k) => pdf.text(String(v || '—').slice(0, Math.floor(cols[k][2] / 1.9)), cols[k][1] + 1, y)); y += 5.5; });
      pdf.save('relatorio-rede.pdf'); notify.success('Relatório gerado.');
    } catch (e) { console.error(e); notify.error('Erro ao gerar o PDF.'); }
  }

  return (
    <>
      <PageHeader icon={Network} title="IPs & Rede" subtitle="Inventário de dispositivos e endereços de rede"
        actions={<><Button variant="outline" size="sm" icon={Upload} onClick={() => setImp(true)}>Importar CSV</Button><Button variant="outline" size="sm" icon={Download} onClick={csv} disabled={!lista.length}>CSV</Button><Button variant="outline" size="sm" icon={FileText} onClick={pdf} disabled={!lista.length}>PDF</Button><Button size="sm" icon={Plus} onClick={() => setModal({})}>Novo dispositivo</Button></>} />
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', marginBottom: 16 }}>
        <StatCard icon={Network} label="Total" value={dispositivos.length} onClick={() => { setFStatus(''); setFConf(false); }} />
        <StatCard icon={CheckCheck} tone="green" label="Ativos" value={cont('Ativo')} onClick={() => setFStatus('Ativo')} />
        <StatCard icon={Network} tone="red" label="Inativos" value={cont('Inativo')} onClick={() => setFStatus('Inativo')} />
        <StatCard icon={Network} tone="amber" label="Reservados" value={cont('Reservado')} onClick={() => setFStatus('Reservado')} />
        <StatCard icon={AlertTriangle} tone={conf.idsEmConflito.size ? 'red' : 'gray'} label="Em conflito" value={conf.idsEmConflito.size} onClick={() => setFConf((v) => !v)} />
      </div>
      {conf.idsEmConflito.size > 0 && <div className="aviso-device" style={{ background: 'var(--red-bg)', color: 'var(--red-fg)', marginBottom: 14 }}><AlertTriangle size={17} style={{ flex: 'none' }} /><div><strong>{conf.ipDup.length} IP(s) e {conf.macDup.length} MAC(s) duplicado(s).</strong> Veja os detalhes em <Link to="/admin/ips/redes">Sub-redes e mapa</Link>.</div></div>}
      <div className="filtros">
        <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por nome, IP, MAC, setor ou local…" />
        <select className="select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">Todos os status</option>{Object.keys(TOM).map((s) => <option key={s}>{s}</option>)}</select>
        <select className="select" value={fTipo} onChange={(e) => setFTipo(e.target.value)}><option value="">Todos os tipos</option>{TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select className="select" value={fSetor} onChange={(e) => setFSetor(e.target.value)}><option value="">Todos os setores</option>{setores.map((s) => <option key={s}>{s}</option>)}</select>
        {redes.length > 0 && <select className="select" value={fRede} onChange={(e) => setFRede(e.target.value)}><option value="">Todas as redes</option>{redes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>}
        <select className="select" value={ordem} onChange={(e) => setOrdem(e.target.value)}><option value="ip">Ordenar: IP</option><option value="nome">Ordenar: nome</option><option value="setor">Ordenar: setor</option></select>
        <div className="tabs"><button className={vista === 'tabela' ? 'ativo' : ''} onClick={() => setVista('tabela')} aria-label="Tabela"><Rows3 size={15} /></button><button className={vista === 'cards' ? 'ativo' : ''} onClick={() => setVista('cards')} aria-label="Cards"><LayoutGrid size={15} /></button></div>
      </div>
      {loading ? <Spinner /> : lista.length === 0 ? <div className="card"><EmptyState icon={Network} title="Nenhum dispositivo encontrado" action={<Button icon={Plus} onClick={() => setModal({})}>Cadastrar dispositivo</Button>}>Cadastre manualmente ou importe uma planilha CSV.</EmptyState></div>
        : vista === 'tabela' ? (
          <div className="table-card"><table><thead><tr><th>Dispositivo</th><th>IP</th><th>MAC</th><th>Setor / local</th><th>Status</th><th>Verificado</th><th /></tr></thead>
            <tbody>{lista.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.dispositivo}</strong><div className="text-xs muted">{tipoRotulo(d.tipo)}{d.hostname && ` · ${d.hostname}`}</div></td>
                <td className="mono nowrap">{d.ip}{conf.idsEmConflito.has(d.id) && <Badge tone="red" icon={AlertTriangle} style={{ marginLeft: 6 }}>conflito</Badge>}<div className="text-xs muted">{d.atribuicao || 'Estático'}{d.vlan && ` · VLAN ${d.vlan}`}</div></td>
                <td className="mono text-sm">{d.mac || '—'}</td><td>{d.setor}<div className="text-xs muted">{d.localizacao}</div></td>
                <td><Badge tone={TOM[d.status || 'Ativo']}>{d.status || 'Ativo'}</Badge></td><td className="text-xs muted">{d.ultimaVerificacao ? fmtData(d.ultimaVerificacao) : '—'}</td>
                <td className="nowrap"><Acoes d={d} copiar={copiar} onEdit={() => setModal({ d })} onDel={() => excluir(d)} perfil={perfil} /></td>
              </tr>))}</tbody></table></div>
        ) : (
          <div className="grid-auto">{lista.map((d) => (
            <div key={d.id} className="card" style={{ borderLeft: `4px solid var(--${d.status === 'Inativo' ? 'danger' : d.status === 'Reservado' ? 'warning' : 'success'})` }}>
              <div className="row"><div style={{ flex: 1, minWidth: 0 }}><strong>{d.dispositivo}</strong><div className="text-xs muted">{tipoRotulo(d.tipo)} · {d.setor}</div></div><Badge tone={TOM[d.status || 'Ativo']}>{d.status || 'Ativo'}</Badge></div>
              <div className="grid-2" style={{ marginTop: 10, gap: 8 }}><div><div className="label">IP</div><code>{d.ip}</code></div><div><div className="label">MAC</div><code className="text-xs">{d.mac || '—'}</code></div></div>
              {d.localizacao && <div className="text-sm muted" style={{ marginTop: 8 }}>{d.localizacao}</div>}
              <div style={{ marginTop: 10, textAlign: 'right' }}><Acoes d={d} copiar={copiar} onEdit={() => setModal({ d })} onDel={() => excluir(d)} perfil={perfil} /></div>
            </div>))}</div>
        )}
      <p className="text-xs muted" style={{ marginTop: 14 }}>Observação: o navegador não consegue executar “ping” (ICMP). Use “Marcar como verificado” após testar o equipamento, ou “Abrir no navegador” para equipamentos com interface web.</p>
      {modal && <DispositivoModal dispositivo={modal.d} inicial={modal.inicial} dispositivos={dispositivos} redes={redes} onClose={() => setModal(null)} />}
      {imp && <Importar dispositivos={dispositivos} perfil={perfil} onClose={() => setImp(false)} />}
    </>
  );
}

function Acoes({ d, copiar, onEdit, onDel, perfil }) {
  return (
    <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
      <Button variant="ghost" size="sm" icon={Copy} title="Copiar IP" onClick={() => copiar(d.ip)} />
      <a className="btn btn-ghost btn-sm" title="Abrir no navegador" href={`http://${d.ip}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>
      <Button variant="ghost" size="sm" icon={CheckCheck} title="Marcar como verificado" onClick={() => marcarVerificado(d, perfil).then(() => notify.success('Verificação registrada.', { som: false }))} />
      <Button variant="ghost" size="sm" icon={Pencil} title="Editar" onClick={onEdit} /><Button variant="ghost" size="sm" icon={Trash2} title="Excluir" onClick={onDel} />
    </div>
  );
}

function Importar({ dispositivos, perfil, onClose }) {
  const [linhas, setLinhas] = useState(null); const [busy, setBusy] = useState(false); const input = useRef(null);
  const validas = linhas?.filter((l) => !l.erros.length) || [];
  const ler = async (file) => { if (file) setLinhas(validarImportacao(parseCSV(await file.text()), dispositivos)); };
  const modelo = () => baixarArquivo('modelo-dispositivos.csv', '﻿' + CSV_COLUNAS.join(';') + '\r\nPC Recepção;💻 Computador;192.168.0.10;00:1A:2B:3C:4D:5E;Recepção Geral;Balcão;Ativo;Estático;pc-recepcao;10;Maria;', 'text/csv;charset=utf-8');
  async function importar() { setBusy(true); try { await importarDispositivos(validas.map((l) => l.dados), perfil); notify.success(`${validas.length} dispositivo(s) importado(s).`); onClose(); } catch (e) { console.error(e); notify.error('Falha na importação.'); setBusy(false); } }
  return (
    <Modal title="Importar dispositivos (CSV)" icon={Upload} onClose={onClose} width={760}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!validas.length} onClick={importar}>Importar {validas.length || ''} válida(s)</Button></>}>
      <div className="row-wrap"><Button variant="outline" size="sm" icon={Download} onClick={modelo}>Baixar modelo</Button><Button size="sm" icon={Upload} onClick={() => input.current?.click()}>Escolher arquivo</Button><input ref={input} hidden type="file" accept=".csv,text/csv" onChange={(e) => ler(e.target.files[0])} /></div>
      <p className="text-xs muted" style={{ margin: '8px 0' }}>Colunas: {CSV_COLUNAS.join(', ')}. Só as linhas válidas são importadas; IPs/MACs já cadastrados são rejeitados.</p>
      {linhas && <div className="table-card" style={{ maxHeight: 320 }}><table><thead><tr><th>Linha</th><th>Dispositivo</th><th>IP</th><th>Resultado</th></tr></thead><tbody>{linhas.map((l) => <tr key={l.linha}><td>{l.linha}</td><td>{l.dados.dispositivo}</td><td className="mono">{l.dados.ip}</td><td>{l.erros.length ? <span style={{ color: 'var(--red-fg)' }}>{l.erros.join('; ')}</span> : <Badge tone="green">OK</Badge>}</td></tr>)}</tbody></table></div>}
    </Modal>
  );
}
export { ipParaInt };
