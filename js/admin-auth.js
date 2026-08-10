// ============================================
// AUTENTICAÇÃO E PERMISSÕES
// ============================================

function checkAuth() {
    const u = localStorage.getItem('usuario_logado');
    
    if (!u) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        usuarioLogado = JSON.parse(u);
        
        if (usuarioLogado.expira && Date.now() > usuarioLogado.expira) {
            localStorage.removeItem('usuario_logado');
            window.location.href = 'login.html';
            return false;
        }
        
        depto = usuarioLogado.departamento || 'TI';
        nomeDepto = depto === 'TI' ? 'Tecnologia da Informação' : 'Manutenção';
        
        return true;
    } catch (e) {
        localStorage.removeItem('usuario_logado');
        window.location.href = 'login.html';
        return false;
    }
}

function getPerms() {
    const isAdmin = usuarioLogado.tipo === 'admin' || usuarioLogado.usuario === 'edson';
    
    return {
        isAdmin,
        isTI: depto === 'TI',
        isManut: depto === 'MANUTENCAO',
        podeEquipe: isAdmin || (depto === 'MANUTENCAO' && 
            (usuarioLogado.usuario === 'bruno' || usuarioLogado.usuario === 'benicio'))
    };
}

function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('usuario_logado');
        window.location.href = 'login.html';
    }
}