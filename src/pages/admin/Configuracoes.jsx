import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { Bell, Building2, Database, Download, Image as ImageIcon, Lock, Plus, Settings, ShieldCheck, Timer, Trash2, Upload, User, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useConfig } from '@/context/ConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { Badge, Button, Card, Field, PageHeader, Switch, Tabs } from '@/components/ui';
import { erroSenha } from '@/lib/validators';
import { baixarArquivo } from '@/lib/format';
import { LOGIN_BLOQUEIO_MS, LOGIN_MAX_TENTATIVAS, OCIOSIDADE_MS, SESSAO_MAX_MS } from '@/lib/constants';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { COLECOES_BACKUP, confirmarForte, executarEmLotes, reviver, serializar } from './config/helpers';
import './config/config.css';

/** Reduz a logo (máx. 400 px, PNG) e devolve um data URL pequeno para guardar no Firestore. */
function logoParaDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 400 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL('image/png'); out.length > 700000 ? reject(new Error('grande')) : resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem')); }; img.src = url;
  });
}

const cfg = (nome, dados, merge = true) => setDoc(doc(db, 'configuracoes', nome), dados, { merge });

export default function Configuracoes() {
  const { perms } = useAuth(); const [aba, setAba] = useState('conta');
  const abas = [{ id: 'conta', label: 'Minha conta', icon: User }, ...(perms.isAdmin ? [
    { id: 'setores', label: 'Setores', icon: Building2 }, { id: 'logos', label: 'Logos', icon: ImageIcon }, { id: 'sla', label: 'SLA', icon: Timer },
    { id: 'notif', label: 'Notificações', icon: Bell }, { id: 'dados', label: 'Dados', icon: Database }, { id: 'seg', label: 'Segurança', icon: ShieldCheck }] : [])];
  return (
    <>
      <PageHeader icon={Settings} title="Configurações" subtitle={perms.isAdmin ? 'Preferências do sistema' : 'Sua conta no HelpHosp'} />
      <div className="cf-wrap">
        <Tabs value={aba} onChange={setAba} tabs={abas} />
        {aba === 'conta' && <Conta />}{aba === 'setores' && <Setores />}{aba === 'logos' && <Logos />}{aba === 'sla' && <Sla />}
        {aba === 'notif' && <Notif />}{aba === 'dados' && <Dados />}{aba === 'seg' && <Seguranca />}
      </div>
    </>
  );
}

function Conta() {
  const { perfil, trocarSenha } = useAuth(); const { tema, alternar } = useTheme();
  const [s, setS] = useState({ atual: '', nova: '', conf: '' }); const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(notify.getState().prefs);
  const setP = (k) => (v) => { setPrefs((p) => ({ ...p, [k]: v })); notify.setPrefs({ [k]: v }); if (k === 'push' && v) notify.pedirPermissaoPush(); if (k === 'som' && v) notify.liberarAudio(); };
  async function alterar(e) {
    e.preventDefault(); const er = erroSenha(s.nova);
    if (er) return notify.warning(er); if (s.nova !== s.conf) return notify.warning('As senhas não conferem.');
    setBusy(true);
    try { await trocarSenha(s.atual, s.nova); notify.success('Senha alterada.'); setS({ atual: '', nova: '', conf: '' }); }
    catch (err) { notify.error(err?.message || 'Não foi possível alterar a senha.'); } finally { setBusy(false); }
  }
  return (<>
    <Card title="Identificação" icon={User}><div className="cf-ident">
      {[['Nome', perfil.nome], ['Usuário', '@' + perfil.usuario], ['Cargo', perfil.cargo || '—'], ['Perfil', perfil.tipo], ['Departamento', perfil.departamento]].map(([k, v]) => <div key={k}><small>{k}</small><span>{v}</span></div>)}</div></Card>
    <Card title="Alterar senha" icon={Lock}><form className="cf-form" onSubmit={alterar}>
      <Field label="Senha atual"><input className="input" type="password" autoComplete="current-password" value={s.atual} onChange={(e) => setS({ ...s, atual: e.target.value })} /></Field>
      <div className="cf-grid"><Field label="Nova senha" hint="Mínimo 8 caracteres, com letras e números."><input className="input" type="password" autoComplete="new-password" value={s.nova} onChange={(e) => setS({ ...s, nova: e.target.value })} /></Field>
        <Field label="Confirmar nova senha"><input className="input" type="password" autoComplete="new-password" value={s.conf} onChange={(e) => setS({ ...s, conf: e.target.value })} /></Field></div>
      <div className="cf-actions"><Button type="submit" loading={busy}>Alterar senha</Button></div></form></Card>
    <Card title="Preferências neste aparelho" icon={Bell}>
      {[['som', 'Som de notificação', 'Toca um aviso curto em novos eventos.'], ['push', 'Notificações do navegador', 'Avisos mesmo com a aba em segundo plano.'], ['toasts', 'Avisos na tela', 'Mensagens rápidas no canto da tela.']].map(([k, t, d]) => (
        <div className="cf-item" key={k}><div><strong>{t}</strong><span className="desc">{d}</span></div><Switch checked={prefs[k] !== false} onChange={setP(k)} /></div>))}
      <div className="cf-item"><div><strong>Tema escuro</strong><span className="desc">Aparência da interface.</span></div><Switch checked={tema === 'dark'} onChange={alternar} /></div></Card>
  </>);
}

function ListaEditavel({ titulo, icon, docNome, campo, itens, placeholder, minimo = 1 }) {
  const [novo, setNovo] = useState(''); const [busy, setBusy] = useState(false);
  async function salvar(lista, msg) { setBusy(true); try { await cfg(docNome, { [campo]: lista }, false); audit('config.' + docNome, { total: lista.length }); notify.success(msg); } catch (e) { console.error(e); notify.error('Erro ao salvar.'); } finally { setBusy(false); } }
  async function add(e) { e.preventDefault(); const v = novo.trim(); if (!v) return; if (itens.some((i) => i.toLowerCase() === v.toLowerCase())) return notify.warning('Já existe.'); await salvar([...itens, v], 'Adicionado.'); setNovo(''); }
  async function rem(i) { if (itens.length <= minimo) return notify.warning('Mantenha ao menos um item.'); if (await notify.confirm(`Remover "${i}"?`, { variante: 'danger', confirmar: 'Remover' })) salvar(itens.filter((x) => x !== i), 'Removido.'); }
  return (<Card title={titulo} icon={icon}>
    <form className="cf-addrow" onSubmit={add}><input className="input" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder={placeholder} /><Button type="submit" icon={Plus} loading={busy}>Adicionar</Button></form>
    <div className="cf-chips">{itens.map((i) => <span className="cf-chip" key={i}>{i}<button type="button" disabled={busy} onClick={() => rem(i)} aria-label={`Remover ${i}`}><X size={12} /></button></span>)}</div></Card>);
}
function Setores() {
  const { setores, departamentos } = useConfig();
  return (<>
    <ListaEditavel titulo="Setores do hospital" icon={Building2} docNome="setores" campo="setores" itens={setores} placeholder="Novo setor…" />
    <ListaEditavel titulo="Departamentos que recebem chamados" icon={Building2} docNome="departamentos_chamados" campo="departamentos" itens={departamentos} placeholder="Ex.: TI, MANUTENCAO" />
  </>);
}

function Logos() {
  const { logos } = useConfig(); const [busy, setBusy] = useState('');
  async function enviar(chave, file) {
    if (!file) return; if (!file.type.startsWith('image/')) return notify.warning('Selecione uma imagem.');
    setBusy(chave);
    try {
      const dataUrl = await logoParaDataUrl(file);
      await cfg('logos', { [chave]: dataUrl }); audit('config.logo', { chave }); notify.success('Logo atualizada.');
    } catch (e) { console.error(e); notify.error('Não foi possível salvar a logo (use uma imagem menor).'); } finally { setBusy(''); }
  }
  return (<Card title="Logos (relatórios e painel)" icon={ImageIcon}><div className="cf-grid">
    {[['hospital', 'Logo do hospital'], ['governo', 'Logo do governo']].map(([k, t]) => (
      <div className="cf-logo" key={k}><strong>{t}</strong><div className="cf-logo-box">{logos[k] ? <img src={logos[k]} alt={t} /> : <span>Nenhuma logo</span>}</div>
        <input type="file" accept="image/*" disabled={busy === k} onChange={(e) => { enviar(k, e.target.files[0]); e.target.value = ''; }} /></div>))}</div></Card>);
}

function Sla() {
  const { slaDoc } = useConfig(); const [f, setF] = useState({ slaCritico: 60, slaAlta: 240, slaMedia: 1440, slaBaixa: 2880, alertaSLA: true }); const [busy, setBusy] = useState(false);
  useEffect(() => { if (slaDoc) setF((s) => ({ ...s, ...slaDoc })); }, [slaDoc]);
  const n = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function salvar() {
    const d = { slaCritico: parseInt(f.slaCritico) || 60, slaAlta: parseInt(f.slaAlta) || 240, slaMedia: parseInt(f.slaMedia) || 1440, slaBaixa: parseInt(f.slaBaixa) || 2880, alertaSLA: !!f.alertaSLA };
    setBusy(true); try { await cfg('sla', d); audit('config.sla', d); notify.success('Prazos salvos.'); } catch (e) { console.error(e); notify.error('Erro ao salvar.'); } finally { setBusy(false); }
  }
  return (<Card title="Prazos de SLA (minutos)" icon={Timer}><div className="cf-form"><div className="cf-grid">
    {[['slaCritico', 'Crítica'], ['slaAlta', 'Alta'], ['slaMedia', 'Média'], ['slaBaixa', 'Baixa']].map(([k, t]) => <Field key={k} label={t}><input className="input" type="number" min="1" value={f[k]} onChange={n(k)} /></Field>)}</div>
    <div className="cf-item"><div><strong>Alertas de SLA</strong><span className="desc">Avisar a equipe quando um chamado estiver perto de vencer ou atrasar.</span></div><Switch checked={f.alertaSLA !== false} onChange={(v) => setF((s) => ({ ...s, alertaSLA: v }))} /></div>
    <div className="cf-actions"><Button loading={busy} onClick={salvar}>Salvar prazos</Button></div></div></Card>);
}

function Notif() {
  const { notifDoc } = useConfig(); const [f, setF] = useState({ notificarNovoChamado: true, notificarSLA: true, notificarConclusao: true, somNotificacao: true }); const [busy, setBusy] = useState(false);
  useEffect(() => { if (notifDoc) setF((s) => ({ ...s, ...notifDoc })); }, [notifDoc]);
  const L = [['notificarNovoChamado', 'Novos chamados', 'Alerta quando um chamado for aberto.'], ['notificarSLA', 'SLA', 'Alerta de prazos próximos ou vencidos.'], ['notificarConclusao', 'Conclusões', 'Alerta quando chamados forem concluídos.'], ['somNotificacao', 'Som', 'Habilita o som de alerta para a equipe.']];
  async function salvar() { setBusy(true); try { await cfg('notificacoes', { ...f, alertaSLA: f.notificarSLA }); audit('config.notificacoes'); notify.success('Notificações salvas.'); } catch (e) { console.error(e); notify.error('Erro ao salvar.'); } finally { setBusy(false); } }
  return (<Card title="Notificações da equipe" icon={Bell}>{L.map(([k, t, d]) => <div className="cf-item" key={k}><div><strong>{t}</strong><span className="desc">{d}</span></div><Switch checked={f[k] !== false} onChange={(v) => setF((s) => ({ ...s, [k]: v }))} /></div>)}
    <div className="cf-actions"><Button loading={busy} onClick={salvar}>Salvar</Button></div></Card>);
}

function Dados() {
  const { perfil } = useAuth(); const [sel, setSel] = useState(() => Object.fromEntries(COLECOES_BACKUP.map((c) => [c.id, true]))); const [busy, setBusy] = useState('');
  async function exportar() {
    setBusy('exp');
    try {
      const out = { versao: 2, data: new Date().toISOString(), exportadoPor: perfil.nome };
      for (const c of COLECOES_BACKUP.filter((x) => sel[x.id])) { const s = await getDocs(collection(db, c.id)); out[c.id] = s.docs.map((d) => ({ id: d.id, ...serializar(d.data()) })); }
      baixarArquivo(`backup-helphosp-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), 'application/json'); audit('backup.exportar'); notify.success('Backup exportado.');
    } catch (e) { console.error(e); notify.error('Erro ao gerar o backup.'); } finally { setBusy(''); }
  }
  function importar() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      let bk; try { bk = JSON.parse(await file.text()); } catch { return notify.error('Arquivo inválido.'); }
      const cols = COLECOES_BACKUP.filter((c) => Array.isArray(bk[c.id]) || (c.legado && Array.isArray(bk[c.legado])));
      if (!cols.length) return notify.warning('O arquivo não contém dados reconhecidos.');
      if (!(await confirmarForte(`Serão restaurados: ${cols.map((c) => c.nome).join(', ')}. Documentos com o mesmo ID serão sobrescritos. Contas de usuário nunca são restauradas.`, 'Restaurar backup'))) return;
      setBusy('imp');
      try {
        const ops = []; cols.forEach((c) => (bk[c.id] || bk[c.legado]).forEach((x) => { const { id, ...d } = x; if (id) ops.push((b) => b.set(doc(db, c.id, id), reviver(d), { merge: true })); }));
        const n = await executarEmLotes(ops); audit('backup.restaurar', { docs: n }); notify.success(`${n} documento(s) restaurado(s).`);
      } catch (e) { console.error(e); notify.error('Erro ao restaurar.'); } finally { setBusy(''); }
    };
    input.click();
  }
  async function limpar() {
    const v = await notify.prompt('Remover chamados com mais de quantos dias?', { titulo: 'Limpar histórico', valor: '365' }); if (v == null) return;
    const dias = parseInt(v); if (isNaN(dias) || dias < 30) return notify.warning('O mínimo é 30 dias.');
    if (!(await confirmarForte(`Todos os chamados com mais de ${dias} dias serão excluídos definitivamente.`, 'Limpar histórico'))) return;
    setBusy('lim');
    try {
      const lim = new Date(); lim.setDate(lim.getDate() - dias);
      const s = await getDocs(query(collection(db, 'chamados'), where('data_abertura', '<', Timestamp.fromDate(lim))));
      if (!s.size) return notify.info('Nenhum chamado encontrado.');
      await executarEmLotes(s.docs.map((d) => (b) => b.delete(d.ref))); audit('chamados.limpeza', { dias, total: s.size }); notify.success(`${s.size} chamado(s) removido(s).`);
    } catch (e) { console.error(e); notify.error('Erro na limpeza.'); } finally { setBusy(''); }
  }
  return (<>
    <Card title="Backup e restauração" icon={Database}>
      <div className="cf-note warn" style={{ marginBottom: 12 }}><Lock size={16} /><span>Contas de usuário vivem no Firebase Auth e não entram no backup nem são restauradas.</span></div>
      <div className="cf-summary">{COLECOES_BACKUP.map((c) => <label key={c.id}><input type="checkbox" checked={sel[c.id]} onChange={(e) => setSel((s) => ({ ...s, [c.id]: e.target.checked }))} />{c.nome}</label>)}</div>
      <div className="cf-actions"><Button variant="outline" icon={Upload} loading={busy === 'imp'} onClick={importar}>Restaurar…</Button><Button icon={Download} loading={busy === 'exp'} onClick={exportar}>Exportar backup</Button></div></Card>
    <Card title="Zona de perigo" icon={Trash2} className="cf-danger"><p className="cf-intro">Exclui definitivamente chamados antigos para reduzir o volume de dados. Exporte um backup antes.</p><Button variant="danger" icon={Trash2} loading={busy === 'lim'} onClick={limpar}>Limpar histórico antigo</Button></Card>
  </>);
}

function Seguranca() {
  const min = (ms) => Math.round(ms / 60000);
  return (<>
    <Card title="Política de segurança em vigor" icon={ShieldCheck}><div className="cf-policy">
      <div className="stat-card"><div><small>Sessão máxima</small><strong>{SESSAO_MAX_MS / 3600000} h</strong></div></div>
      <div className="stat-card"><div><small>Logout por inatividade</small><strong>{min(OCIOSIDADE_MS)} min</strong></div></div>
      <div className="stat-card"><div><small>Bloqueio de login</small><strong>{LOGIN_MAX_TENTATIVAS} tentativas → {min(LOGIN_BLOQUEIO_MS)} min</strong></div></div>
      <div className="stat-card"><div><small>Senha</small><strong>8+ com letras e números</strong></div></div></div></Card>
    <Card title="Como a proteção funciona" icon={Lock}><div className="cf-form">
      {['Cada aparelho recebe uma identidade anônima; o solicitante só consegue ler os chamados abertos por ele (regra do Firestore, não apenas da tela).', 'A equipe entra com e-mail/senha do Firebase Auth e só acessa os chamados do seu departamento; administradores e supervisores gerenciam a equipe.', 'Ações sensíveis são gravadas na Auditoria, que é imutável.', 'Redefinição de senha de outro membro: pelo console do Firebase ou recriando o cadastro na Equipe.'].map((t) => <div className="cf-note" key={t}><ShieldCheck size={16} /><span>{t}</span></div>)}
      <div><Badge tone="green">Regras do Firestore e Storage ativas após o deploy</Badge></div></div></Card>
  </>);
}
