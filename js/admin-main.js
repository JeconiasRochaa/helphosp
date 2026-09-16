// ============================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================

window.app = {
    toggleTheme,
    logout,
    navegar,
    toast
};

let __hhIniciado = false;

async function init() {
    if (__hhIniciado) return;
    __hhIniciado = true;

    console.log('HelpHosp Admin v3.0 — iniciando');

    if (!checkAuth()) {
        console.log('Não autenticado');
        return;
    }

    console.log('Autenticado:', usuarioLogado.nome, '-', depto);

    initTheme();
    await loadConfig();
    console.log('Configurações carregadas. Setores:', setores.length);

    initUI();

    // Permissão de notificações do navegador (silenciosa, sem travar a UI)
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => HH.pedirPermissaoPush(), 2500);
    }

    if (window.__hhPrimeiroAcesso) {
        setTimeout(() => {
            HH.alerta('Este é seu primeiro acesso. Por segurança, altere sua senha em Configurações antes de continuar.', {
                titulo: 'Primeiro acesso',
                variante: 'warning',
                confirmar: 'Entendi'
            });
        }, 900);
    }

    console.log('Painel carregado com sucesso!');
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('load', init);
}
