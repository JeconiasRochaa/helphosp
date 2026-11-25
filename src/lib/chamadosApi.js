import {
  addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc, writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { audit } from './audit';
import { nowTs } from './format';
import { STATUS_FLUXO } from './constants';
import { enviarImagens } from './images';

const ref = (id) => doc(db, 'chamados', id);
const evento = (status, acao) => ({ data: new Date().toISOString(), status, acao });

export function gerarProtocolo() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
  return `CH-${dia}-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;
}

/** Cria chamado pelo portal público. `deviceUid` vincula o chamado ao aparelho (privacidade). */
export async function criarChamadoPortal(dados, fotosComprimidas = [], onProgress) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sem identidade do aparelho. Recarregue a página.');
  const protocolo = gerarProtocolo();
  let fotos = []; let falhaFotos = false;
  if (fotosComprimidas.length) {
    try { fotos = await enviarImagens(fotosComprimidas, `chamados/${protocolo}`, onProgress); }
    catch (e) { console.error('upload fotos', e); falhaFotos = true; }
  }
  const agora = nowTs();
  const docData = {
    protocolo, departamento: dados.departamento, tipo: dados.tipo || 'chamado', titulo: dados.titulo, descricao: dados.descricao || '',
    solicitante: dados.solicitante, contato: dados.contato || '', setor: dados.setor, categoria: dados.categoria,
    prioridade: dados.prioridade || 'Média', status: 'A Fazer', origem: 'portal', deviceUid: uid,
    fotos, temFoto: fotos.length > 0, data_abertura: agora, data_atualizacao: agora,
    timeline: [evento('A Fazer', `Chamado aberto por ${dados.solicitante}` + (fotos.length ? ` com ${fotos.length} foto(s)` : ''))]
  };
  const r = await addDoc(collection(db, 'chamados'), docData);
  return { id: r.id, protocolo, fotos, falhaFotos };
}

/** Cria chamado pela equipe (painel). */
export async function criarChamadoEquipe(dados, perfil, fotosComprimidas = [], onProgress) {
  const protocolo = gerarProtocolo();
  let fotos = []; let falhaFotos = false;
  if (fotosComprimidas.length) {
    try { fotos = await enviarImagens(fotosComprimidas, `chamados/${protocolo}`, onProgress); } catch { falhaFotos = true; }
  }
  const agora = nowTs();
  const r = await addDoc(collection(db, 'chamados'), {
    protocolo, tipo: 'chamado', descricao: '', contato: '', ...dados, status: 'A Fazer', origem: 'painel',
    tecnico: perfil.nome, deviceUid: auth.currentUser.uid, fotos, temFoto: fotos.length > 0,
    data_abertura: agora, data_atualizacao: agora,
    timeline: [evento('A Fazer', `Aberto por ${perfil.nome}` + (fotos.length ? ` com ${fotos.length} foto(s)` : ''))]
  });
  audit('chamado.criar', { protocolo });
  return { id: r.id, protocolo, falhaFotos };
}

/** Avança o status respeitando posse do chamado. Retorna { ok, motivo?, status? }. */
export async function avancarStatus(c, perfil, perms) {
  if (c.status === 'Concluído') return { ok: false, motivo: 'Este chamado já foi concluído. Um administrador pode reabri-lo.' };
  const dono = c.tecnico;
  if (dono && dono !== perfil.nome && !perms.isAdmin) return { ok: false, motivo: `Chamado em atendimento por ${dono}. Só ${dono} ou um administrador pode avançar o status.` };
  const novo = STATUS_FLUXO[c.status || 'A Fazer'];
  if (!novo) return { ok: false, motivo: 'Não há um próximo status para este chamado.' };
  const up = {
    status: novo, data_atualizacao: nowTs(),
    timeline: arrayUnion(evento(novo, `Status alterado para "${novo}" por ${perfil.nome}`))
  };
  if (!dono) up.tecnico = perfil.nome;
  if (novo === 'Concluído') { up.concluido_por = perfil.nome; up.data_conclusao = nowTs(); }
  await updateDoc(ref(c.id || c.fid), up);
  audit('chamado.status', { protocolo: c.protocolo, de: c.status, para: novo });
  return { ok: true, status: novo };
}

export async function reabrirChamado(c, perfil, motivo) {
  await updateDoc(ref(c.id || c.fid), {
    status: 'Em Andamento', data_atualizacao: nowTs(),
    timeline: arrayUnion(evento('Em Andamento', `Chamado reaberto por ${perfil.nome} (administrador)` + (motivo ? ` — ${motivo}` : '')))
  });
  audit('chamado.reabrir', { protocolo: c.protocolo, motivo });
}

export async function definirPrioridade(c, prioridade, perfil) {
  await updateDoc(ref(c.id), {
    prioridade, data_atualizacao: nowTs(),
    timeline: arrayUnion(evento(c.status, `Prioridade alterada de ${c.prioridade} para ${prioridade} por ${perfil.nome}`))
  });
  audit('chamado.prioridade', { protocolo: c.protocolo, de: c.prioridade, para: prioridade });
}

export async function assumirChamado(c, perfil) {
  await updateDoc(ref(c.id), {
    tecnico: perfil.nome, data_atualizacao: nowTs(),
    timeline: arrayUnion(evento(c.status, `${perfil.nome} assumiu o atendimento`))
  });
  audit('chamado.assumir', { protocolo: c.protocolo });
}

export async function definirExecutante(c, nome, perfil) {
  await updateDoc(ref(c.id), {
    executante: nome, timeline: arrayUnion(evento(c.status, `Executante definido: ${nome} (por ${perfil.nome})`))
  });
}

export async function excluirChamado(c) {
  await deleteDoc(ref(c.id));
  audit('chamado.excluir', { protocolo: c.protocolo, titulo: c.titulo });
}

export async function anexarFotosEquipe(c, fotosComprimidas, perfil, onProgress) {
  const urls = await enviarImagens(fotosComprimidas, `chamados/${c.protocolo || c.id}/equipe`, onProgress);
  await updateDoc(ref(c.id), {
    fotos_equipe: arrayUnion(...urls), data_atualizacao: nowTs(),
    timeline: arrayUnion(evento(c.status, `${perfil.nome} anexou ${urls.length} foto(s) ao atendimento`))
  });
  return urls;
}

/**
 * Comentário (subcoleção chamados/{id}/comentarios).
 *  visibilidade: 'publico' (solicitante enxerga) | 'interno' (só equipe)
 *  autorTipo:    'solicitante' | 'equipe'
 * Também atualiza campos de resumo no chamado para disparar notificações em tempo real.
 */
export async function adicionarComentario({ chamado, texto, visibilidade = 'publico', autorTipo, autor, fotos = [] }) {
  const uid = auth.currentUser.uid;
  let anexos = [];
  if (fotos.length) anexos = await enviarImagens(fotos, `chamados/${chamado.protocolo || chamado.id}/comentarios`);
  const batch = writeBatch(db);
  const cRef = doc(collection(db, 'chamados', chamado.id, 'comentarios'));
  batch.set(cRef, { texto: texto.trim(), visibilidade, autorTipo, autor, autorUid: uid, anexos, criadoEm: serverTimestamp() });
  if (visibilidade === 'publico') {
    batch.update(ref(chamado.id), {
      ultimo_comentario_em: serverTimestamp(), ultimo_comentario_por: autorTipo,
      qtd_comentarios_publicos: (chamado.qtd_comentarios_publicos || 0) + 1
    });
  }
  await batch.commit();
  return cRef.id;
}

export async function buscarChamado(id) {
  const s = await getDoc(ref(id));
  return s.exists() ? { id: s.id, fid: s.id, ...s.data() } : null;
}
