import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Lock, MessageSquare, Paperclip, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { adicionarComentario } from '@/lib/chamadosApi';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Button, PhotoGallery, PhotoPicker, Switch } from '@/components/ui';
import { fmtData, toDate } from '@/lib/format';
import { notify } from '@/lib/notify';

/**
 * Conversa do chamado.
 *   modo="portal": o solicitante vê só comentários públicos (as regras do Firestore também garantem isso).
 *   modo="equipe": a equipe vê tudo e pode escrever notas internas (invisíveis para o solicitante).
 */
export default function Comentarios({ chamado, modo }) {
  const { perfil } = useAuth();
  const equipe = modo === 'equipe';
  const [lista, setLista] = useState([]);
  const [texto, setTexto] = useState('');
  const [interno, setInterno] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [anexar, setAnexar] = useState(false);
  const [busy, setBusy] = useState(false);
  const fim = useRef(null);

  useEffect(() => {
    const col = collection(db, 'chamados', chamado.id, 'comentarios');
    const q = equipe ? query(col, orderBy('criadoEm', 'asc')) : query(col, where('visibilidade', '==', 'publico'));
    return onSnapshot(q, (s) => setLista(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.error('comentarios', e));
  }, [chamado.id, equipe]);

  // comentários antigos (array no próprio documento) — só a equipe os vê, como notas internas
  const legados = equipe ? (chamado.comentarios || []).map((c, i) => ({ id: 'leg' + i, texto: c.texto, autor: c.autor, autorTipo: 'equipe', visibilidade: 'interno', criadoEm: c.data, legado: true })) : [];
  const todos = [...legados, ...lista].sort((a, b) => toDate(a.criadoEm) - toDate(b.criadoEm));
  useEffect(() => { fim.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [todos.length]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim() && !fotos.length) return;
    setBusy(true);
    try {
      await adicionarComentario({
        chamado, texto: texto || '(foto)', fotos,
        visibilidade: equipe && interno ? 'interno' : 'publico',
        autorTipo: equipe ? 'equipe' : 'solicitante',
        autor: equipe ? perfil.nome : (chamado.solicitante || 'Solicitante')
      });
      setTexto(''); setFotos([]); setAnexar(false);
      if (equipe && !interno) notify.success('Resposta enviada ao solicitante.', { som: false });
    } catch (err) { console.error(err); notify.error('Não foi possível enviar o comentário.'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="thread" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
        {todos.length === 0 && <div className="empty" style={{ padding: 24 }}><MessageSquare /><p>{equipe ? 'Nenhum comentário ainda.' : 'Ainda não há mensagens. Use o campo abaixo para falar com a equipe.'}</p></div>}
        {todos.map((c) => {
          const meu = equipe ? c.autorTipo === 'equipe' : c.autorTipo === 'solicitante';
          return (
            <div key={c.id} className={'msg' + (meu ? ' meu' : '') + (c.visibilidade === 'interno' ? ' interno' : '')}>
              <Avatar nome={c.autor} size="sm" />
              <div className="msg-bubble">
                <div className="msg-meta"><strong>{c.autor}</strong>
                  <span>{c.autorTipo === 'equipe' ? 'Equipe' : 'Solicitante'}</span>
                  {c.visibilidade === 'interno' && <span className="row" style={{ gap: 3, color: 'var(--amber-fg)' }}><Lock size={11} />Nota interna{c.legado ? ' (antiga)' : ''}</span>}
                  <span>{fmtData(c.criadoEm)}</span></div>
                <div className="msg-text">{c.texto}</div>
                {c.anexos?.length > 0 && <div style={{ marginTop: 8 }}><PhotoGallery urls={c.anexos} /></div>}
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>

      <form onSubmit={enviar} style={{ marginTop: 14, display: 'grid', gap: 10 }}>
        <textarea className="textarea" rows={2} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar(e); }}
          placeholder={equipe ? (interno ? 'Nota interna (o solicitante não verá)…' : 'Responder ao solicitante…') : 'Escreva uma mensagem para a equipe…'}
          style={interno ? { background: 'var(--amber-bg)' } : undefined} />
        {anexar && <PhotoPicker value={fotos} onChange={setFotos} max={2} />}
        <div className="row-wrap">
          <Button variant="ghost" size="sm" icon={Paperclip} onClick={() => setAnexar((a) => !a)}>{anexar ? 'Ocultar fotos' : 'Anexar foto'}</Button>
          {equipe && <Switch checked={interno} onChange={setInterno} label="Nota interna" />}
          <span className="spacer" /><span className="text-xs muted">Ctrl+Enter envia</span>
          <Button type="submit" size="sm" icon={Send} loading={busy} disabled={!texto.trim() && !fotos.length}>{equipe && interno ? 'Salvar nota' : 'Enviar'}</Button>
        </div>
      </form>
    </div>
  );
}
