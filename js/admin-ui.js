// ============================================
// INTERFACE DO USUÁRIO
// ============================================

function initUI() {
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('userRole').textContent = `${usuarioLogado.cargo} · ${nomeDepto}`;
    document.getElementById('userAvatar').textContent = usuarioLogado.nome.charAt(0).toUpperCase();
    buildMenu();
    carregarTodosDados();
}

function buildMenu() {
    const p = getPerms();
    const nav = document.getElementById('sidebarNav');
    const dep = departamentoAtual();
    
    let h = '';
    
    // ============================================
    // MENU PRINCIPAL (COMUM A TODOS)
    // ============================================
    h += '<div class="nav-section"><div class="nav-title">Principal</div>';
    h += navItem('dashboard', 'chart-pie', 'Dashboard', true);
    h += navItem('tv', 'tv', 'Painel TV');
    h += navItem('chamados', 'ticket-alt', 'Chamados', false, 'badgeChamados');
    h += navItem('sla', 'clock', 'Monitor SLA', false, 'badgeSLA');
    h += navItem('indicadores', 'chart-line', 'Indicadores');
    h += '</div>';
    
    // ============================================
    // MENU GESTÃO (APENAS TI E ADMIN)
    // ============================================
    if (dep === 'TI' || p.isAdmin) {
        h += '<div class="nav-section"><div class="nav-title">Gestão</div>';
        h += navItem('gesthosp', 'hospital-user', 'GestHosp', false, 'badgeGestHosp');
        h += navItem('toners', 'print', 'Toners');
        h += navItem('estoque', 'box', 'Estoque');
        h += navItem('inventario', 'clipboard-list', 'Inventário');
        h += navItem('ips', 'network-wired', 'IPs & Rede');
        h += '</div>';
    }
    
    // ============================================
    // MENU EQUIPE (APENAS ADMIN E SUPERVISORES)
    // ============================================
    if (p.podeEquipe) {
        h += '<div class="nav-section"><div class="nav-title">Administração</div>';
        h += navItem('equipe', 'users-cog', 'Equipe');
        h += '</div>';
    }
    
    // ============================================
    // MENU RECURSOS (COMUM A TODOS)
    // ============================================
    h += '<div class="nav-section"><div class="nav-title">Recursos</div>';
    h += navItem('arquivos', 'folder-open', 'Arquivos');
    h += navItem('agenda', 'calendar-alt', 'Agenda', false, 'badgeAgenda');
    h += navItem('config', 'cog', 'Configurações');
    h += '</div>';
    
    nav.innerHTML = h;
    
    console.log('📋 Menu construído para:', nomeDepto, '| Permissões:', p);
}

function navItem(s, ic, tx, at = false, bd = null) {
    const badge = bd ? `<span class="badge-notify" id="${bd}">0</span>` : '';
    return `<div class="nav-item${at ? ' active' : ''}" data-secao="${s}" onclick="navegar('${s}', this)">
        <i class="fas fa-${ic}"></i><span>${tx}</span>${badge}
    </div>`;
}

function navegar(s, el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    if (window.innerWidth < 1025) document.getElementById('sidebar').classList.remove('open');
    
    if (s === 'tv') {
        const dep = departamentoAtual();
        window.open('painel_tv.html?dep=' + dep, '_blank');
        return;
    }
    
    switch (s) {
        case 'dashboard': renderDashboard(); break;
        case 'chamados': renderChamados(); break;
        case 'sla': renderSLA(); break;
        case 'gesthosp': renderGestHosp(); break;
        case 'indicadores': renderIndicadores(); break;
        case 'toners': renderToners(); break;
        case 'estoque': renderEstoque(); break;
        case 'inventario': renderInventario(); break;
        case 'ips': renderIPs(); break;
        case 'equipe': renderEquipe(); break;
        case 'arquivos': renderArquivos(); break;
        case 'agenda': renderAgenda(); break;
        case 'config': renderConfig(); break;
        default:
            console.warn('⚠️ Seção não encontrada:', s);
    }
}

function atualizarBadges() {
    const dep = departamentoAtual();
    
    // Badge de chamados (apenas do departamento atual)
    const b1 = document.getElementById('badgeChamados');
    if (b1) {
        const n = chamados.filter(c => c.tipo !== 'gesthosp' && c.status !== 'Concluído').length;
        b1.style.display = n > 0 ? 'inline-block' : 'none';
        b1.textContent = n > 99 ? '99+' : n;
    }
    
    // Badge de SLA
    const b2 = document.getElementById('badgeSLA');
    if (b2) {
        const n = chamados.filter(c => getSLAStatus(c) === 'sla-critical').length;
        b2.style.display = n > 0 ? 'inline-block' : 'none';
        b2.textContent = n;
    }
    
    // Badge de GestHosp (apenas TI)
    if (dep === 'TI') {
        const b3 = document.getElementById('badgeGestHosp');
        if (b3) {
            const n = chamados.filter(c => c.tipo === 'gesthosp' && c.status !== 'Concluído').length;
            b3.style.display = n > 0 ? 'inline-block' : 'none';
            b3.textContent = n > 99 ? '99+' : n;
        }
    }
}

async function verificarAgenda() {
    try {
        const h = new Date();
        h.setHours(0, 0, 0, 0);
        
        const s = await db.collection('agenda')
            .where('data', '>=', firebase.firestore.Timestamp.fromDate(h))
            .where('departamento', '==', departamentoAtual())
            .get();
        
        const b = document.getElementById('badgeAgenda');
        if (b) {
            b.style.display = s.size > 0 ? 'inline-block' : 'none';
            b.textContent = s.size;
        }
    } catch (e) {
        console.error('Erro ao verificar agenda:', e);
    }
}