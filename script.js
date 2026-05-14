// ============================================
// GESTHOSP - SCRIPT DE LOGIN
// ============================================

/**
 * Alterna a visibilidade da senha
 */
function togglePassword() {
    const senhaInput = document.getElementById('senha');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        senhaInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

/**
 * Manipula o envio do formulário de login
 * @param {Event} event - Evento de submit do formulário
 */
function handleLogin(event) {
    event.preventDefault();
    
    // Obter valores dos campos
    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value.trim();
    
    // Elementos de mensagem
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Ocultar mensagens anteriores
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    
    // Validação de campos vazios
    if (!usuario) {
        showError('Por favor, informe o usuário.');
        document.getElementById('usuario').focus();
        return;
    }
    
    if (!senha) {
        showError('Por favor, informe a senha.');
        document.getElementById('senha').focus();
        return;
    }
    
    // Simulação de autenticação
    // Em produção, isso seria uma chamada API para o servidor
    if (usuario === 'admin' && senha === '123456') {
        // Login bem-sucedido
        showSuccess('✅ Acesso autorizado. Redirecionando...');
        
        // Salvar estado de "lembrar-me"
        const lembrar = document.getElementById('lembrar').checked;
        if (lembrar) {
            localStorage.setItem('gesthosp_remember', 'true');
            localStorage.setItem('gesthosp_user', usuario);
        } else {
            localStorage.removeItem('gesthosp_remember');
            localStorage.removeItem('gesthosp_user');
        }
        
        // Salvar sessão
        localStorage.setItem('gesthosp_logado', 'true');
        localStorage.setItem('gesthosp_usuario', usuario);
        
        // Redirecionar após breve delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } else {
        // Login falhou
        showError('❌ Usuário ou senha inválidos.');
        
        // Limpar campo de senha por segurança
        document.getElementById('senha').value = '';
        document.getElementById('senha').focus();
    }
}

/**
 * Exibe mensagem de erro
 * @param {string} message - Mensagem a ser exibida
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
    
    // Adicionar animação de shake
    errorMessage.style.animation = 'none';
    errorMessage.offsetHeight; // Trigger reflow
    errorMessage.style.animation = 'shake 0.5s ease';
}

/**
 * Exibe mensagem de sucesso
 * @param {string} message - Mensagem a ser exibida
 */
function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se há usuário lembrado
    const remembered = localStorage.getItem('gesthosp_remember');
    if (remembered === 'true') {
        const savedUser = localStorage.getItem('gesthosp_user');
        if (savedUser) {
            document.getElementById('usuario').value = savedUser;
            document.getElementById('lembrar').checked = true;
        }
    }
    
    // Foco automático no campo usuário
    document.getElementById('usuario').focus();
    
    // Adicionar animação shake
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});
