// ============================================
// INICIALIZAÇÃO DO PORTAL PÚBLICO
// ============================================

// Expor funções globalmente para os onclick do HTML
window.app = {
    toggleSuporte,
    fecharTudo,
    fecharModal,
    abrirFormulario,
    abrirGestHosp,
    mostrarMeusChamados,
    verDetalhes
};

window.departamentoSelecionado = '';

/**
 * Configura os event listeners
 */
function setupEventListeners() {
    // Botão enviar chamado
    const btnChamado = document.getElementById('btnSubmitChamado');
    if (btnChamado) {
        btnChamado.addEventListener('click', function(e) {
            e.preventDefault();
            criarChamado();
        });
    }
    
    // Botão enviar GestHosp
    const btnGestHosp = document.getElementById('btnSubmitGestHosp');
    if (btnGestHosp) {
        btnGestHosp.addEventListener('click', function(e) {
            e.preventDefault();
            criarGestHosp();
        });
    }
    
    // Mudança de categoria
    const selectCategoria = document.getElementById('categoria');
    if (selectCategoria) {
        selectCategoria.addEventListener('change', atualizarPrioridadeAuto);
    }
    
    // Busca CEP
    const inputCEP = document.getElementById('ghCEP');
    if (inputCEP) {
        inputCEP.addEventListener('blur', buscarCEP);
    }
    
    // Fechar modal ao clicar fora
    const modal = document.getElementById('modalDetalhes');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) fecharModal();
        });
    }
    
    // Tecla ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            fecharModal();
            fecharTudo();
        }
    });
}

/**
 * Função principal de inicialização
 */
async function inicializarPortal() {
    try {
        console.log('🚀 HelpHosp Portal iniciando...');
        
        // Preencher estados
        preencherEstados();
        
        // Carregar configurações
        const [departamentos, setoresData, contatos] = await Promise.all([
            carregarDepartamentos(),
            carregarSetores(),
            carregarContatosSuporte()
        ]);
        
        // Atualizar variáveis globais
        departamentosChamados = departamentos;
        setores = setoresData;
        
        // Renderizar interface
        renderizarActionGrid(departamentos);
        preencherSetores(setoresData);
        renderizarContatos(contatos);
        
        // Configurar eventos
        setupEventListeners();
        
        console.log('✅ HelpHosp Portal inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        
        // Fallback para dados padrão
        renderizarActionGrid(['TI', 'MANUTENCAO']);
        preencherSetores(SETORES_PADRAO);
        
        const containerContatos = document.getElementById('contatosSuporte');
        if (containerContatos) {
            containerContatos.innerHTML = '<span class="loading-text">Erro ao carregar contatos</span>';
        }
        
        setupEventListeners();
    }
}

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPortal);
} else {
    inicializarPortal();
}