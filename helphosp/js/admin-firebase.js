// ============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
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
const storage = firebase.storage();

// ============================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega configurações gerais (setores, departamentos, logos)
 */
async function loadConfig() {
    try {
        // Carregar setores
        const ds = await db.collection('configuracoes').doc('setores').get();
        if (ds.exists && ds.data().setores) {
            setores = ds.data().setores;
        }
        
        // Carregar departamentos
        const dd = await db.collection('configuracoes').doc('departamentos_chamados').get();
        if (dd.exists && dd.data().departamentos) {
            departamentosChamados = dd.data().departamentos;
        }
        
        // Carregar logos
        const dl = await db.collection('configuracoes').doc('logos').get();
        if (dl.exists) {
            if (dl.data().hospital) logoHospital = dl.data().hospital;
            if (dl.data().governo) logoGoverno = dl.data().governo;
        }
    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
    }
}

/**
 * Carrega todos os dados iniciais
 */
async function carregarTodosDados() {
    try {
        const dep = departamentoAtual();
        
        // Chamados do departamento
        const sc = await db.collection('chamados')
            .where('departamento', '==', dep)
            .get();
        chamados = montarListaChamados(sc);
        
        // Inventário
        const si = await db.collection('inventario').get();
        inventario = [];
        si.forEach(d => {
            const x = d.data();
            x.fid = d.id;
            inventario.push(x);
        });
        
        // Estoque
        const se = await db.collection('estoque').get();
        estoque = [];
        se.forEach(d => {
            const x = d.data();
            x.fid = d.id;
            estoque.push(x);
        });
        
        // Movimentações
        const sm = await db.collection('movimentacoes')
            .orderBy('data', 'desc')
            .limit(200)
            .get();
        movimentacoes = [];
        sm.forEach(d => {
            const x = d.data();
            x.fid = d.id;
            movimentacoes.push(x);
        });
        
        renderDashboard();
        escutarChamados();
        atualizarBadges();
        verificarAgenda();
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        renderDashboard();
    }
}

/**
 * Escuta mudanças em tempo real nos chamados do departamento.
 * Uma única implementação: detecta novos chamados, dispara o popup
 * de notificação e mantém a tela atual sincronizada.
 */
let unsubscribeChamados = null;

function escutarChamados() {
    const dep = departamentoAtual();

    // Evita listeners duplicados ao trocar de seção
    if (unsubscribeChamados) {
        unsubscribeChamados();
        unsubscribeChamados = null;
    }

    unsubscribeChamados = db.collection('chamados')
        .where('departamento', '==', dep)
        .onSnapshot(snap => {
            const anteriores = new Set(chamados.map(c => c.fid));
            const atuais = montarListaChamados(snap);
            const primeiraCarga = chamados.length === 0 && !window.__hhJaCarregou;

            if (!primeiraCarga) {
                atuais
                    .filter(c => !anteriores.has(c.fid) && c.status === 'A Fazer')
                    .forEach(c => {
                        // Popup na tela
                        HH.novoChamado(c, {
                            acao: {
                                texto: 'Abrir chamado',
                                onClick: () => { navegar('chamados'); setTimeout(() => verDetalhes(c.fid), 350); }
                            }
                        });

                        // Notificação do navegador (funciona com a aba em segundo plano)
                        HH.push(`${c.prioridade === 'Crítica' ? 'Chamado crítico' : 'Novo chamado'} — ${c.prioridade || 'Média'}`, {
                            body: `${c.titulo || 'Sem título'}\nSetor: ${c.setor || '—'} · ${c.solicitante || '—'}`,
                            tag: 'chamado-' + c.fid,
                            requireInteraction: c.prioridade === 'Crítica',
                            data: { url: 'admin.html' }
                        });
                    });
            }

            window.__hhJaCarregou = true;
            chamados = atuais;

            atualizarBadges();
            verificarAgenda();

            // Atualiza somente a tela que está aberta
            if (document.getElementById('infoTotal')) atualizarDashboard();
            if (document.getElementById('tabelaChamados')) filtrarChamadosUI();
            if (document.getElementById('tabelaSLA') && typeof renderSLA === 'function') renderSLA();
        }, erro => {
            console.error('Erro ao escutar chamados:', erro);
            HH.erro('Conexão com o servidor instável. Os dados podem estar desatualizados.');
        });
}

/**
 * Monta lista de chamados a partir de um snapshot
 */
function montarListaChamados(snap) {
    const lista = [];
    snap.forEach(d => {
        const x = d.data();
        x.fid = d.id;
        lista.push(x);
    });
    return ordenarChamadosPorData(lista);
}

/**
 * Ordena chamados por data de abertura (mais recentes primeiro)
 */
function ordenarChamadosPorData(lista) {
    return lista.sort((a, b) => toDate(b.data_abertura) - toDate(a.data_abertura));
}