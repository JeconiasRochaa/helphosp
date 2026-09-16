// ============================================
// INTEGRAÇÃO WHATSAPP
// ============================================

class WhatsAppIntegration {
    constructor() {
        this.apiUrl = 'https://api.whatsapp.com/send';
        this.businessApiUrl = 'https://graph.facebook.com/v18.0'; // WhatsApp Business API
    }
    
    // Enviar mensagem via WhatsApp Web
    enviarMensagem(numero, mensagem) {
        const numeroLimpo = numero.replace(/\D/g, '');
        const mensagemCodificada = encodeURIComponent(mensagem);
        const url = `${this.apiUrl}?phone=55${numeroLimpo}&text=${mensagemCodificada}`;
        
        window.open(url, '_blank');
    }
    
    // Notificar técnico sobre novo chamado
    notificarTecnico(chamado, tecnico) {
        const mensagem = this.formatarMensagemChamado(chamado);
        this.enviarMensagem(tecnico.whatsapp, mensagem);
    }
    
    // Notificar solicitante sobre status
    notificarSolicitante(chamado, status) {
        if (!chamado.contato) return;
        
        const mensagens = {
            'Em Andamento': `✅ *HelpHosp*\n\nSeu chamado *${chamado.protocolo}* foi iniciado!\n\nTécnico: ${chamado.tecnico || 'Aguardando'}\n\nAcompanhe pelo portal.`,
            'Concluído': `🎉 *HelpHosp*\n\nSeu chamado *${chamado.protocolo}* foi concluído!\n\nTítulo: ${chamado.titulo}\n\nObrigado por utilizar nossos serviços!`,
            'Pendente': `⏳ *HelpHosp*\n\nSeu chamado *${chamado.protocolo}* está pendente.\n\nMotivo: Aguardando peças/recursos.`
        };
        
        const mensagem = mensagens[status] || `📋 *HelpHosp*\n\nAtualização do chamado *${chamado.protocolo}*: ${status}`;
        this.enviarMensagem(chamado.contato, mensagem);
    }
    
    // Formatar mensagem de chamado
    formatarMensagemChamado(chamado) {
        const prioridade = chamado.prioridade === 'Crítica' ? '🔴' : 
                          chamado.prioridade === 'Alta' ? '🟠' : 
                          chamado.prioridade === 'Média' ? '🟡' : '🟢';
        
        return `🚨 *NOVO CHAMADO* ${prioridade}\n\n` +
               `📋 *Protocolo:* ${chamado.protocolo}\n` +
               `📝 *Título:* ${chamado.titulo}\n` +
               `📍 *Setor:* ${chamado.setor}\n` +
               `⚡ *Prioridade:* ${chamado.prioridade}\n` +
               `👤 *Solicitante:* ${chamado.solicitante}\n` +
               `📞 *Contato:* ${chamado.contato || 'Não informado'}\n\n` +
               `_Acesse o painel para mais detalhes._`;
    }
    
    // Criar link rápido para WhatsApp
    criarLinkWhatsApp(numero, texto = 'Olá! Preciso de ajuda com...') {
        const numeroLimpo = numero.replace(/\D/g, '');
        return `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(texto)}`;
    }
    
    // Enviar relatório diário (WhatsApp Business API)
    async enviarRelatorioDiario(adminNumero) {
        const hoje = new Date();
        const chamadosHoje = chamados.filter(c => {
            const d = c.data_abertura?.toDate ? c.data_abertura.toDate() : new Date(c.data_abertura);
            return d.toDateString() === hoje.toDateString();
        });
        
        const mensagem = `📊 *RELATÓRIO DIÁRIO*\n${hoje.toLocaleDateString('pt-BR')}\n\n` +
                        `📋 Total: ${chamadosHoje.length}\n` +
                        `✅ Concluídos: ${chamadosHoje.filter(c => c.status === 'Concluído').length}\n` +
                        `⏳ Pendentes: ${chamadosHoje.filter(c => c.status !== 'Concluído').length}\n` +
                        `🔴 Críticos: ${chamadosHoje.filter(c => c.prioridade === 'Crítica').length}`;
        
        this.enviarMensagem(adminNumero, mensagem);
    }
}

// Instância global
const whatsapp = new WhatsAppIntegration();

// Função auxiliar para criar links de WhatsApp em qualquer lugar
function criarLinkWhatsApp(numero, texto) {
    return whatsapp.criarLinkWhatsApp(numero, texto);
}

function notificarWhatsApp(chamado, tipo) {
    if (tipo === 'tecnico') {
        whatsapp.notificarTecnico(chamado, { whatsapp: chamado.contato });
    } else {
        whatsapp.notificarSolicitante(chamado, tipo);
    }
}