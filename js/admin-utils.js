// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function toast(m, t = 'info') {
    const e = document.createElement('div');
    e.className = `toast ${t}`;
    e.innerHTML = `<i class="fas fa-${t === 'success' ? 'check-circle' : t === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${m}`;
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 4000);
}

function fmtData(d) {
    if (!d) return '—';
    try {
        const dt = d?.toDate ? d.toDate() : new Date(d);
        if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
}

function fmtDataCurta(d) {
    if (!d) return '—';
    try {
        const dt = d?.toDate ? d.toDate() : new Date(d);
        if (isNaN(dt.getTime())) return '—';
        const a = new Date();
        const diff = Math.floor((a - dt) / 1000);
        if (diff < 60) return 'agora';
        if (diff < 3600) return Math.floor(diff / 60) + 'min';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        return Math.floor(diff / 86400) + 'd';
    } catch (e) { return '—'; }
}

function toDate(d) {
    if (!d) return new Date(0);
    return d?.toDate ? d.toDate() : new Date(d);
}

function sanitizar(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function getStatusClass(s) {
    const c = { 'Concluído': 'badge-green', 'Em Andamento': 'badge-amber', 'Pendente': 'badge-red', 'A Fazer': 'badge-blue' };
    return c[s] || 'badge-blue';
}

function getPrioridadeClass(p) {
    const c = { 'Baixa': 'badge-blue', 'Média': 'badge-amber', 'Alta': 'badge-red', 'Crítica': 'badge-red' };
    return c[p] || 'badge-blue';
}

function abrirModal(conteudo, mw = '750px') {
    const m = document.createElement('div');
    m.className = 'modal-overlay ativa';
    m.innerHTML = `<div class="modal-box" style="max-width:${mw};">${conteudo}</div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    return m;
}

function normalizarDepartamento(v) {
    const s = (v || '').toString().trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('MANUT')) return 'MANUTENCAO';
    if (s === 'TI' || s.includes('TECNOLOGIA') || s.includes('INFORMATICA')) return 'TI';
    return s;
}

function departamentoAtual() {
    return normalizarDepartamento(depto || usuarioLogado?.departamento || 'TI');
}

function getSLAStatus(c) {
    if (c.status === 'Concluído') return 'sla-ok';
    const sla = { 'Crítica': 3600000, 'Alta': 14400000, 'Média': 86400000, 'Baixa': 172800000 };
    const ab = toDate(c.data_abertura), ag = new Date(), pr = sla[c.prioridade] || 86400000, tr = pr - (ag - ab);
    if (tr <= 0) return 'sla-critical';
    if (tr < pr * 0.3) return 'sla-warning';
    return 'sla-ok';
}

function getSLATexto(c) {
    const s = getSLAStatus(c);
    if (s === 'sla-critical') return '🔴 Atrasado';
    if (s === 'sla-warning') return '🟡 Próximo';
    return '🟢 No prazo';
}

function toggleTheme() {
    const h = document.documentElement, i = document.getElementById('themeIcon');
    if (h.getAttribute('data-theme') === 'dark') {
        h.removeAttribute('data-theme');
        i.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        h.setAttribute('data-theme', 'dark');
        i.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fas fa-sun';
    }
}