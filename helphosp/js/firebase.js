// ============================================================
// FIREBASE — PORTAL PÚBLICO
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBXeV-uxTIzF7rCgLTFTCz5zE9WCq2gQgE",
    authDomain: "helphosp.firebaseapp.com",
    projectId: "helphosp",
    storageBucket: "helphosp.firebasestorage.app",
    messagingSenderId: "1075623193163",
    appId: "1:1075623193163:web:cf54ee082d1c97a9aa7bce"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Storage é opcional: se o SDK não estiver carregado, o sistema segue
// funcionando normalmente, apenas sem anexo de fotos.
let storage = null;
try {
    if (firebase.storage) storage = firebase.storage();
} catch (e) {
    console.warn('Storage indisponível:', e);
}

// Estado do portal
let departamentosChamados = ['TI', 'MANUTENCAO'];
let setores = [];
let departamentoSelecionado = '';

// ============================================================
// CONFIGURAÇÕES
// ============================================================

async function carregarDepartamentos() {
    try {
        const doc = await db.collection('configuracoes').doc('departamentos_chamados').get();
        const deps = doc.exists ? doc.data().departamentos : null;
        if (Array.isArray(deps) && deps.length) return deps;
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
    }
    return ['TI', 'MANUTENCAO'];
}

async function carregarSetores() {
    try {
        const doc = await db.collection('configuracoes').doc('setores').get();
        const lista = doc.exists ? doc.data().setores : null;
        if (Array.isArray(lista) && lista.length) return lista.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));
    } catch (error) {
        console.error('Erro ao carregar setores:', error);
    }
    return SETORES_PADRAO;
}

async function carregarContatosSuporte() {
    try {
        const snapshot = await db.collection('usuarios').where('status', '==', 'ativo').get();
        const contatos = [];

        snapshot.forEach(doc => {
            const user = doc.data();
            // Só aparece no portal quem autorizou explicitamente
            if (user.mostrarContato !== true) return;
            if (!user.whatsapp) return;

            contatos.push({
                id: doc.id,
                nome: user.nome || 'Técnico',
                cargo: user.cargo || '',
                whatsapp: String(user.whatsapp).replace(/\D/g, ''),
                departamento: normalizarDep(user.departamento)
            });
        });

        contatos.sort((a, b) => a.departamento.localeCompare(b.departamento) || a.nome.localeCompare(b.nome, 'pt-BR'));
        return contatos;
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
        return [];
    }
}

function normalizarDep(valor) {
    const s = String(valor || 'TI').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('MANUT')) return 'MANUTENCAO';
    if (s === 'TI' || s.includes('TECNOLOGIA') || s.includes('INFORMATICA')) return 'TI';
    return s;
}

// ============================================================
// FOTOS — compressão no navegador + upload para o Storage
// ============================================================

const FOTO_MAX_BYTES = 8 * 1024 * 1024;
const FOTO_MAX_LADO = 1600;
const FOTO_QUALIDADE = 0.82;

/**
 * Reduz a imagem antes de enviar. Economiza dados do celular do
 * solicitante e deixa o carregamento no painel/TV bem mais rápido.
 */
function comprimirImagem(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Arquivo não é uma imagem'));
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                let { width, height } = img;
                const escala = Math.min(1, FOTO_MAX_LADO / Math.max(width, height));
                width = Math.round(width * escala);
                height = Math.round(height * escala);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('Falha ao processar imagem')); return; }
                    resolve({ blob, width, height, dataUrl: canvas.toDataURL('image/jpeg', 0.6) });
                }, 'image/jpeg', FOTO_QUALIDADE);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Não foi possível ler a imagem'));
        };

        img.src = url;
    });
}

/**
 * Envia as fotos e devolve a lista de URLs públicas.
 * onProgress recebe 0–100.
 */
async function enviarFotosChamado(arquivos, protocolo, onProgress) {
    if (!storage || !arquivos || !arquivos.length) return [];

    const urls = [];
    const total = arquivos.length;

    for (let i = 0; i < total; i++) {
        const item = arquivos[i];
        const nome = `chamados/${protocolo}/${Date.now()}_${i + 1}.jpg`;
        const ref = storage.ref(nome);

        await new Promise((resolve, reject) => {
            const task = ref.put(item.blob, { contentType: 'image/jpeg' });
            task.on('state_changed',
                snap => {
                    const parcial = snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0;
                    if (onProgress) onProgress(Math.round(((i + parcial) / total) * 100));
                },
                reject,
                async () => {
                    try {
                        urls.push(await task.snapshot.ref.getDownloadURL());
                        resolve();
                    } catch (e) { reject(e); }
                }
            );
        });
    }

    if (onProgress) onProgress(100);
    return urls;
}

// ============================================================
// CHAMADOS
// ============================================================

function gerarProtocolo() {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
    const aleatorio = Math.random().toString(36).toUpperCase().slice(2, 5);
    return `CH-${dia}-${Date.now().toString(36).toUpperCase().slice(-4)}${aleatorio}`;
}

/**
 * Cria o chamado. Se houver fotos, elas são enviadas antes e
 * gravadas junto no documento (campo `fotos`).
 */
async function criarChamadoFirestore(chamado, arquivos, onProgress) {
    const protocolo = gerarProtocolo();

    let fotos = [];
    if (arquivos && arquivos.length) {
        try {
            fotos = await enviarFotosChamado(arquivos, protocolo, onProgress);
        } catch (e) {
            // O chamado é mais importante que o anexo: seguimos sem a foto.
            console.error('Erro no upload das fotos:', e);
            if (window.HH) HH.aviso('Não foi possível anexar as fotos, mas o chamado será aberto.');
        }
    }

    const agora = firebase.firestore.Timestamp.now();

    const novoChamado = {
        protocolo,
        departamento: chamado.departamento,
        tipo: chamado.tipo || 'chamado',
        titulo: chamado.titulo,
        descricao: chamado.descricao || '',
        solicitante: chamado.solicitante,
        contato: chamado.contato || '',
        setor: chamado.setor,
        categoria: chamado.categoria,
        prioridade: chamado.prioridade || 'Média',
        status: 'A Fazer',
        origem: 'portal',
        fotos,
        temFoto: fotos.length > 0,
        data_abertura: agora,
        data_atualizacao: agora,
        timeline: [{
            data: new Date().toISOString(),
            status: 'A Fazer',
            acao: `Chamado aberto por ${chamado.solicitante}` + (fotos.length ? ` com ${fotos.length} foto(s)` : '')
        }]
    };

    const ref = await db.collection('chamados').add(novoChamado);
    return { protocolo, id: ref.id, fotos };
}

async function buscarChamadosHoje() {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        const snapshot = await db.collection('chamados')
            .where('data_abertura', '>=', firebase.firestore.Timestamp.fromDate(hoje))
            .where('data_abertura', '<', firebase.firestore.Timestamp.fromDate(amanha))
            .orderBy('data_abertura', 'desc')
            .limit(80)
            .get();

        const chamados = [];
        snapshot.forEach(doc => {
            const c = doc.data();
            c.id = doc.id;
            chamados.push(c);
        });

        // Pendentes primeiro, concluídos ao final
        chamados.sort((a, b) => {
            const ca = a.status === 'Concluído' ? 1 : 0;
            const cb = b.status === 'Concluído' ? 1 : 0;
            return ca - cb;
        });

        return chamados;
    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        throw error;
    }
}

async function buscarDetalhesChamado(id) {
    try {
        const doc = await db.collection('chamados').doc(id).get();
        if (!doc.exists) return null;
        const chamado = doc.data();
        chamado.id = doc.id;
        return chamado;
    } catch (error) {
        console.error('Erro ao buscar detalhes:', error);
        return null;
    }
}
