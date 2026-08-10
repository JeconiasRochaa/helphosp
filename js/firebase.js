// ============================================
// CONFIGURAÇÃO FIREBASE - PORTAL PÚBLICO
// ============================================

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

// Variáveis do portal
let departamentosChamados = ['TI', 'MANUTENCAO'];
let setores = [];
let departamentoSelecionado = '';

/**
 * Carrega departamentos do Firestore
 */
async function carregarDepartamentos() {
    try {
        const doc = await db.collection('configuracoes').doc('departamentos_chamados').get();
        if (doc.exists && doc.data().departamentos) {
            return doc.data().departamentos;
        }
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
    }
    return ['TI', 'MANUTENCAO'];
}

/**
 * Carrega setores do Firestore
 */
async function carregarSetores() {
    try {
        const doc = await db.collection('configuracoes').doc('setores').get();
        if (doc.exists && doc.data().setores) {
            return doc.data().setores;
        }
    } catch (error) {
        console.error('Erro ao carregar setores:', error);
    }
    return SETORES_PADRAO;
}

/**
 * Carrega contatos de suporte
 */
async function carregarContatosSuporte() {
    try {
        console.log('🔍 Buscando contatos de suporte...');
        
        // Buscar TODOS os usuários ativos
        const snapshot = await db.collection('usuarios')
            .where('status', '==', 'ativo')
            .get();
        
        console.log('📊 Usuários ativos encontrados:', snapshot.size);
        
        const contatos = [];
        snapshot.forEach(doc => {
            const user = doc.data();
            
            // ⚠️ SÓ ADICIONA se mostrarContato for TRUE
            // Se o campo não existir, considera como FALSE (não mostra)
            if (user.mostrarContato !== true) {
                console.log('⏭️ Oculto:', user.nome, '(mostrarContato:', user.mostrarContato, ')');
                return; // Pula este usuário
            }
            
            // Só adiciona se tiver WhatsApp
            if (user.whatsapp) {
                console.log('✅ Visível:', user.nome, '| WhatsApp:', user.whatsapp);
                contatos.push({
                    id: doc.id,
                    nome: user.nome || 'Técnico',
                    cargo: user.cargo || '',
                    whatsapp: user.whatsapp.replace(/\D/g, ''),
                    departamento: user.departamento || 'TI'
                });
            }
        });
        
        console.log('✅ Contatos carregados:', contatos.length);
        return contatos;
        
    } catch (error) {
        console.error('❌ Erro ao carregar contatos:', error);
        return [];
    }
}
/**
 * Cria um novo chamado
 */
async function criarChamadoFirestore(chamado) {
    try {
        const protocolo = 'CH-' + Date.now().toString(36).toUpperCase().slice(-8);
        
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
            data_abertura: firebase.firestore.Timestamp.now(),
            timeline: [{
                data: new Date().toISOString(),
                status: 'A Fazer',
                acao: `Chamado aberto por ${chamado.solicitante}`
            }]
        };
        
        await db.collection('chamados').add(novoChamado);
        return protocolo;
    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        throw error;
    }
}

/**
 * Busca chamados do dia
 */
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
            .limit(50)
            .get();
        
        const chamados = [];
        snapshot.forEach(doc => {
            const chamado = doc.data();
            chamado.id = doc.id;
            chamados.push(chamado);
        });
        
        chamados.sort((a, b) => {
            if (a.status === 'Concluído' && b.status !== 'Concluído') return 1;
            if (a.status !== 'Concluído' && b.status === 'Concluído') return -1;
            return 0;
        });
        
        return chamados;
    } catch (error) {
        console.error('Erro ao buscar chamados:', error);
        return [];
    }
}

/**
 * Busca detalhes de um chamado
 */
async function buscarDetalhesChamado(id) {
    try {
        const doc = await db.collection('chamados').doc(id).get();
        if (doc.exists) {
            const chamado = doc.data();
            chamado.id = doc.id;
            return chamado;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar detalhes:', error);
        return null;
    }
}