// ============================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================

window.app = {
    toggleTheme,
    logout,
    navegar,
    toast
};

async function init() {
    console.log('🚀 HelpHosp Admin iniciando...');
    
    if (!checkAuth()) {
        console.log('❌ Não autenticado');
        return;
    }
    
    console.log('✅ Autenticado:', usuarioLogado.nome, '-', depto);
    
    initTheme();
    await loadConfig();
    console.log('✅ Configurações carregadas. Setores:', setores.length);
    
    initUI();
    
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    console.log('✅ Painel carregado com sucesso!');
}

window.addEventListener('load', init);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 100);
}