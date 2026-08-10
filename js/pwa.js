// ============================================
// PWA - REGISTRO E GERENCIAMENTO
// ============================================

class HelpHospPWA {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }
    
    init() {
        this.registerServiceWorker();
        this.listenForInstall();
        this.checkInstallStatus();
    }
    
    // Registrar Service Worker
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker não suportado');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registrado:', registration.scope);
            
            // Verificar atualizações
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nova versão encontrada!');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🆕 Nova versão disponível!');
                        this.showUpdateNotification();
                    }
                });
            });
            
            return registration;
        } catch (error) {
            console.error('❌ Erro ao registrar Service Worker:', error);
        }
    }
    
    // Escutar evento de instalação
    listenForInstall() {
        window.addEventListener('beforeinstallprompt', (event) => {
            // Prevenir o mini-infobar
            event.preventDefault();
            this.deferredPrompt = event;
            
            console.log('📲 PWA pode ser instalado!');
            
            // Mostrar botão de instalação personalizado
            this.showInstallButton();
        });
        
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            console.log('✅ PWA instalado com sucesso!');
            
            // Esconder botão de instalação
            this.hideInstallButton();
            
            // Mostrar mensagem de sucesso
            if (typeof toast === 'function') {
                toast('✅ Aplicativo instalado com sucesso!', 'success');
            }
        });
    }
    
    // Verificar se já está instalado
    checkInstallStatus() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            console.log('📱 Executando como PWA instalado');
        }
    }
    
    // Mostrar botão de instalação
    showInstallButton() {
        // Criar botão flutuante
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.innerHTML = '<i class="fas fa-download"></i> Instalar App';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: var(--primary, #06224a);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideUp 0.5s ease;
            transition: all 0.3s;
        `;
        
        installBtn.addEventListener('click', () => this.installPWA());
        
        // Remover botão existente se houver
        const existingBtn = document.getElementById('pwa-install-btn');
        if (existingBtn) existingBtn.remove();
        
        document.body.appendChild(installBtn);
    }
    
    // Esconder botão de instalação
    hideInstallButton() {
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.remove();
    }
    
    // Instalar PWA
    async installPWA() {
        if (!this.deferredPrompt) {
            console.warn('⚠️ Instalação não disponível');
            return;
        }
        
        // Mostrar o prompt de instalação
        this.deferredPrompt.prompt();
        
        // Aguardar resposta do usuário
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`📲 Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
        
        // Limpar o prompt
        this.deferredPrompt = null;
        this.hideInstallButton();
    }
    
    // Mostrar notificação de atualização
    showUpdateNotification() {
        const updateDiv = document.createElement('div');
        updateDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background: white;
            color: #1A202C;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            animation: slideDown 0.5s ease;
        `;
        
        updateDiv.innerHTML = `
            <i class="fas fa-sync-alt" style="color:#3182CE;"></i>
            <span>Nova versão disponível!</span>
            <button onclick="location.reload()" style="
                background: #3182CE;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            ">Atualizar</button>
        `;
        
        document.body.appendChild(updateDiv);
        
        // Remover após 10 segundos
        setTimeout(() => {
            if (updateDiv.parentElement) updateDiv.remove();
        }, 10000);
    }
}

// Inicializar PWA
const pwa = new HelpHospPWA();