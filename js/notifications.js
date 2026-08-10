// ============================================
// SISTEMA DE NOTIFICAÇÕES PUSH
// ============================================

class NotificationSystem {
    constructor() {
        this.permission = 'default';
        this.swRegistration = null;
        this.init();
    }
    
    async init() {
        await this.checkPermission();
        await this.getSWRegistration();
    }
    
    // Verificar permissão
    async checkPermission() {
        if (!('Notification' in window)) {
            console.warn('⚠️ Notificações não suportadas');
            return;
        }
        
        this.permission = Notification.permission;
        console.log('🔔 Permissão de notificação:', this.permission);
        
        if (this.permission === 'default') {
            // Mostrar botão para solicitar permissão
            this.showPermissionRequest();
        }
    }
    
    // Obter registro do Service Worker
    async getSWRegistration() {
        if (!('serviceWorker' in navigator)) return;
        
        try {
            this.swRegistration = await navigator.serviceWorker.ready;
            console.log('✅ Service Worker pronto para push');
        } catch (error) {
            console.error('❌ Erro ao obter SW:', error);
        }
    }
    
    // Solicitar permissão
    async requestPermission() {
        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            console.log('🔔 Permissão:', result);
            
            if (result === 'granted') {
                this.showNotification('HelpHosp', {
                    body: 'Notificações ativadas com sucesso! ✅',
                    icon: '/icons/icon-192x192.png'
                });
                
                if (typeof toast === 'function') {
                    toast('✅ Notificações ativadas!', 'success');
                }
            } else {
                if (typeof toast === 'function') {
                    toast('⚠️ Notificações bloqueadas', 'warning');
                }
            }
            
            return result;
        } catch (error) {
            console.error('❌ Erro ao solicitar permissão:', error);
        }
    }
    
    // Mostrar botão de permissão
    showPermissionRequest() {
        // Só mostrar se não estiver no login
        if (window.location.pathname.includes('login.html')) return;
        
        const banner = document.createElement('div');
        banner.id = 'notification-banner';
        banner.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9998;
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            max-width: 350px;
            animation: slideInRight 0.5s ease;
        `;
        
        banner.innerHTML = `
            <i class="fas fa-bell" style="font-size:24px;color:#F59E0B;"></i>
            <div style="flex:1;">
                <strong>Ativar notificações</strong>
                <p style="font-size:11px;color:#64748B;margin:2px 0;">Receba alertas de novos chamados</p>
            </div>
            <button onclick="notifications.requestPermission();this.parentElement.remove();" style="
                background: #06224a;
                color: white;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
            ">Ativar</button>
            <button onclick="this.parentElement.remove();" style="
                background: none;
                border: none;
                color: #A0AEC0;
                cursor: pointer;
                font-size: 18px;
                padding: 0 4px;
            ">&times;</button>
        `;
        
        document.body.appendChild(banner);
        
        // Auto-remover após 15 segundos
        setTimeout(() => {
            if (banner.parentElement) banner.remove();
        }, 15000);
    }
    
    // Mostrar notificação
    showNotification(title, options = {}) {
        if (this.permission !== 'granted') return;
        
        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            timestamp: Date.now()
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        if (this.swRegistration) {
            this.swRegistration.showNotification(title, finalOptions);
        } else {
            new Notification(title, finalOptions);
        }
    }
    
    // Notificar novo chamado
    notificarNovoChamado(chamado) {
        const prioridade = chamado.prioridade || 'Normal';
        const icon = prioridade === 'Crítica' ? '🔴' : prioridade === 'Alta' ? '🟠' : '📋';
        
        this.showNotification(`${icon} Novo Chamado - ${prioridade}`, {
            body: `${chamado.titulo}\nSetor: ${chamado.setor}\nSolicitante: ${chamado.solicitante}`,
            tag: `chamado-${chamado.protocolo}`,
            requireInteraction: prioridade === 'Crítica',
            vibrate: prioridade === 'Crítica' ? [300, 200, 300, 200, 300] : [200, 100, 200],
            data: {
                url: '/admin.html',
                chamadoId: chamado.fid
            }
        });
        
        // Também tentar notificação sonora
        this.tocarSomNotificacao(prioridade);
    }
    
    // Tocar som de notificação
    tocarSomNotificacao(prioridade) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            if (prioridade === 'Crítica') {
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } else {
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (e) {}
    }
    
    // Agendar notificação
    agendarNotificacao(titulo, opcoes, delayMs) {
        setTimeout(() => {
            this.showNotification(titulo, opcoes);
        }, delayMs);
    }
}

// Instância global
const notifications = new NotificationSystem();

// Expor função global para usar nos chamados
function notificarPush(chamado) {
    notifications.notificarNovoChamado(chamado);
}