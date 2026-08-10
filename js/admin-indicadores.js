// ============================================
// INDICADORES AVANÇADOS
// ============================================

function renderIndicadores() {
    const main = document.getElementById('mainContent');
    
    main.innerHTML = `
    <div class="top-bar">
        <h1>📊 Indicadores</h1>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <select id="indTipo" onchange="atualizarIndicadoresUI()" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:11px;background:var(--card);color:var(--text);">
                <option value="7">Últimos 7 dias</option>
                <option value="30" selected>Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="mes">Mês atual</option>
                <option value="mes_anterior">Mês anterior</option>
                <option value="personalizado">📅 Período Personalizado</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="mostrarDesempenhoTecnicos()">
                <i class="fas fa-user-check"></i> Desempenho
            </button>
            <button class="btn btn-primary btn-sm" onclick="mostrarServicosTecnicos()">
                <i class="fas fa-list-check"></i> Serviços
            </button>
            <button class="btn btn-outline btn-sm" onclick="exportarIndicadoresPDF()">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
            <button class="btn btn-outline btn-sm" onclick="exportarIndicadoresPowerPoint()" style="background:#FFF5F5;color:#C53030;border:1px solid #FEB2B2;">
                <i class="fas fa-file-powerpoint"></i> PowerPoint
            </button>
        </div>
    </div>

    <div id="filtroPersonalizado" style="display:none;background:var(--card);padding:12px;border-radius:8px;margin-bottom:14px;border:1px solid var(--border);">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <label style="font-size:11px;font-weight:600;">Data Início:</label>
            <input type="date" id="dataInicio" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;">
            <label style="font-size:11px;font-weight:600;">Data Fim:</label>
            <input type="date" id="dataFim" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;">
            <button class="btn btn-primary btn-sm" onclick="atualizarIndicadoresUI()">🔍 Filtrar</button>
        </div>
    </div>
    
    <div class="stats-grid" id="indicadorGrid"></div>
    
    <div class="charts-grid">
        <div class="chart-card"><h3>📈 Evolução de Chamados</h3><canvas id="graficoEvolucao"></canvas></div>
        <div class="chart-card"><h3>🎯 Distribuição por Prioridade</h3><canvas id="graficoPrioridadeInd"></canvas></div>
    </div>
    
    <div class="charts-grid">
        <div class="chart-card"><h3>📊 Chamados por Status</h3><canvas id="graficoStatusInd"></canvas></div>
        <div class="chart-card"><h3>📅 Chamados por Dia da Semana</h3><canvas id="graficoSemanalInd"></canvas></div>
    </div>
    
    <div class="charts-grid">
        <div class="chart-card"><h3>🔧 Equipamentos com Mais Problemas</h3><canvas id="graficoEquipamentos"></canvas></div>
        <div class="chart-card"><h3>🏢 Setores com Mais Chamados</h3><canvas id="graficoSetoresInd"></canvas></div>
    </div>
    
    <div class="table-card">
        <h3>📋 Resumo por Status</h3>
        <table>
            <thead><tr><th>Status</th><th>Quantidade</th><th>Percentual</th><th>Barra</th></tr></thead>
            <tbody id="tabelaStatusInd"></tbody>
        </table>
    </div>`;
    
    document.getElementById('indTipo').addEventListener('change', function() {
        const filtroDiv = document.getElementById('filtroPersonalizado');
        if (this.value === 'personalizado') {
            filtroDiv.style.display = 'block';
        } else {
            filtroDiv.style.display = 'none';
            atualizarIndicadoresUI();
        }
    });
    
    atualizarIndicadoresUI();
}

function getPeriodoFiltro(tipo) {
    const agora = new Date();
    let inicio, fim;
    
    switch (tipo) {
        case '7':
            inicio = new Date(agora);
            inicio.setDate(inicio.getDate() - 7);
            inicio.setHours(0, 0, 0, 0);
            fim = new Date(agora);
            fim.setHours(23, 59, 59);
            break;
        case '30':
            inicio = new Date(agora);
            inicio.setDate(inicio.getDate() - 30);
            inicio.setHours(0, 0, 0, 0);
            fim = new Date(agora);
            fim.setHours(23, 59, 59);
            break;
        case '90':
            inicio = new Date(agora);
            inicio.setDate(inicio.getDate() - 90);
            inicio.setHours(0, 0, 0, 0);
            fim = new Date(agora);
            fim.setHours(23, 59, 59);
            break;
        case 'mes':
            inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
            fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'mes_anterior':
            inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
            fim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59);
            break;
        case 'personalizado':
            const dataInicio = document.getElementById('dataInicio')?.value;
            const dataFim = document.getElementById('dataFim')?.value;
            if (dataInicio && dataFim) {
                inicio = new Date(dataInicio + 'T00:00:00');
                fim = new Date(dataFim + 'T23:59:59');
            } else {
                inicio = new Date(agora);
                inicio.setDate(inicio.getDate() - 30);
                fim = new Date(agora);
            }
            break;
        default:
            inicio = new Date(agora);
            inicio.setDate(inicio.getDate() - 30);
            inicio.setHours(0, 0, 0, 0);
            fim = new Date(agora);
            fim.setHours(23, 59, 59);
    }
    
    return { inicio, fim };
}

function atualizarIndicadoresUI() {
    const tipo = document.getElementById('indTipo')?.value || '30';
    const { inicio, fim } = getPeriodoFiltro(tipo);
    
    const filtrados = chamados.filter(c => {
        const d = toDate(c.data_abertura);
        return !isNaN(d.getTime()) && d >= inicio && d <= fim;
    });
    
    const total = filtrados.length;
    const concluidos = filtrados.filter(c => c.status === 'Concluído').length;
    const pendentes = total - concluidos;
    const criticos = filtrados.filter(c => c.prioridade === 'Crítica').length;
    const taxa = total > 0 ? Math.round(concluidos / total * 100) : 0;
    
    const chamadosConcluidos = filtrados.filter(c => c.status === 'Concluído' && c.data_atualizacao);
    let tempoMedioHoras = 0;
    if (chamadosConcluidos.length > 0) {
        const tempoTotal = chamadosConcluidos.reduce((s, c) => {
            return s + (toDate(c.data_atualizacao) - toDate(c.data_abertura));
        }, 0);
        tempoMedioHoras = Math.round(tempoTotal / chamadosConcluidos.length / 3600000 * 10) / 10;
    }
    
    document.getElementById('indicadorGrid').innerHTML = `
        <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-clipboard-list"></i></div><div class="stat-info"><small>Total</small><strong>${total}</strong></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-info"><small>Concluídos (${taxa}%)</small><strong>${concluidos}</strong></div></div>
        <div class="stat-card"><div class="stat-icon amber"><i class="fas fa-clock"></i></div><div class="stat-info"><small>Pendentes</small><strong>${pendentes}</strong></div></div>
        <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><small>Críticos</small><strong>${criticos}</strong></div></div>
        <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-hourglass-half"></i></div><div class="stat-info"><small>Tempo Médio</small><strong>${tempoMedioHoras}h</strong></div></div>
    `;
    
    document.getElementById('tabelaStatusInd').innerHTML = ['A Fazer', 'Em Andamento', 'Pendente', 'Concluído'].map(s => {
        const q = filtrados.filter(c => c.status === s).length;
        const pct = total > 0 ? Math.round(q / total * 100) : 0;
        const cor = s === 'A Fazer' ? '#3B82F6' : s === 'Em Andamento' ? '#F59E0B' : s === 'Pendente' ? '#EF4444' : '#10B981';
        return `<tr><td><span class="badge ${getStatusClass(s)}">${s}</span></td><td><strong>${q}</strong></td><td>${pct}%</td><td><div style="background:#E2E8F0;border-radius:10px;height:20px;overflow:hidden;"><div style="background:${cor};height:100%;width:${pct}%;transition:width 0.5s;"></div></div></td></tr>`;
    }).join('');
    
    Object.values(charts).forEach(c => { if (c) c.destroy(); });
    charts = {};
    
    gerarGraficoEvolucao(filtrados, inicio, fim);
    gerarGraficoPrioridade(filtrados);
    gerarGraficoStatus(filtrados);
    gerarGraficoSemanal(filtrados);
    gerarGraficoEquipamentos(filtrados);
    gerarGraficoSetores(filtrados);
}

function gerarGraficoEvolucao(filtrados, inicio, fim) {
    const labels = [], totais = [], concl = [];
    const dias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
    const intervalos = Math.min(12, dias);
    
    for (let i = 0; i <= intervalos; i++) {
        const d = new Date(inicio);
        d.setDate(d.getDate() + Math.floor((i * dias) / (intervalos + 1)));
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }));
        
        const dl = new Date(d);
        dl.setDate(dl.getDate() - Math.floor(dias / (intervalos + 1)));
        
        const periodoChamados = filtrados.filter(c => {
            const cd = toDate(c.data_abertura);
            return cd >= dl && cd <= d;
        });
        
        totais.push(periodoChamados.length);
        concl.push(periodoChamados.filter(c => c.status === 'Concluído').length);
    }
    
    const ctx = document.getElementById('graficoEvolucao');
    if (ctx) {
        charts.evol = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Total', data: totais, backgroundColor: 'rgba(49,130,206,0.4)', borderColor: '#3182CE', borderWidth: 2 },
                    { label: 'Concluídos', data: concl, backgroundColor: 'rgba(56,161,105,0.4)', borderColor: '#38A169', borderWidth: 2 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

function gerarGraficoPrioridade(filtrados) {
    const dados = {};
    filtrados.forEach(c => { const pr = c.prioridade || 'Média'; dados[pr] = (dados[pr] || 0) + 1; });
    
    const ctx = document.getElementById('graficoPrioridadeInd');
    if (ctx) {
        charts.prioridadeInd = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dados),
                datasets: [{ data: Object.values(dados), backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#DC2626'], borderWidth: 2, borderColor: '#fff' }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '50%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15 } },
                    tooltip: { callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return `${ctx.label}: ${ctx.raw} (${t > 0 ? Math.round(ctx.raw / t * 100) : 0}%)`; } } }
                }
            }
        });
    }
}

function gerarGraficoStatus(filtrados) {
    const statuses = ['A Fazer', 'Em Andamento', 'Pendente', 'Concluído'];
    const dados = statuses.map(s => filtrados.filter(c => c.status === s).length);
    
    const ctx = document.getElementById('graficoStatusInd');
    if (ctx) {
        charts.statusInd = new Chart(ctx, {
            type: 'bar',
            data: { labels: statuses, datasets: [{ data: dados, backgroundColor: ['#3B82F6', '#F59E0B', '#EF4444', '#10B981'], borderWidth: 0, borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
}

function gerarGraficoSemanal(filtrados) {
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const contagem = {};
    diasSemana.forEach(d => contagem[d] = 0);
    filtrados.forEach(c => { const dia = diasSemana[toDate(c.data_abertura).getDay()]; contagem[dia]++; });
    
    const ctx = document.getElementById('graficoSemanalInd');
    if (ctx) {
        charts.semanalInd = new Chart(ctx, {
            type: 'bar',
            data: { labels: diasSemana, datasets: [{ data: diasSemana.map(d => contagem[d]), backgroundColor: ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'], borderWidth: 0, borderRadius: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
}

function gerarGraficoEquipamentos(filtrados) {
    const equipamentos = {};
    filtrados.forEach(c => { const cat = c.categoria || 'Outros'; equipamentos[cat] = (equipamentos[cat] || 0) + 1; });
    const sorted = Object.entries(equipamentos).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    const ctx = document.getElementById('graficoEquipamentos');
    if (ctx) {
        charts.equipamentos = new Chart(ctx, {
            type: 'bar',
            data: { labels: sorted.map(e => e[0]), datasets: [{ data: sorted.map(e => e[1]), backgroundColor: 'rgba(99,102,241,0.6)', borderColor: '#6366F1', borderWidth: 1, borderRadius: 6 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });
    }
}

function gerarGraficoSetores(filtrados) {
    const setores = {};
    filtrados.forEach(c => { const s = c.setor || 'Outros'; setores[s] = (setores[s] || 0) + 1; });
    const sorted = Object.entries(setores).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    const ctx = document.getElementById('graficoSetoresInd');
    if (ctx) {
        charts.setoresInd = new Chart(ctx, {
            type: 'pie',
            data: { labels: sorted.map(e => e[0]), datasets: [{ data: sorted.map(e => e[1]), backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 } } } } }
        });
    }
}

// ============================================
// DESEMPENHO DE TÉCNICOS
// ============================================
function mostrarDesempenhoTecnicos() {
    const tipo = document.getElementById('indTipo')?.value || '30';
    const { inicio, fim } = getPeriodoFiltro(tipo);
    
    const filtrados = chamados.filter(c => {
        const d = toDate(c.data_abertura);
        return !isNaN(d.getTime()) && d >= inicio && d <= fim && c.tecnico;
    });
    
    const tecnicos = {};
    filtrados.forEach(c => {
        if (!tecnicos[c.tecnico]) tecnicos[c.tecnico] = { total: 0, concluidos: 0, criticos: 0, alta: 0, media: 0, baixa: 0, tempoMedio: 0, tempos: [] };
        tecnicos[c.tecnico].total++;
        if (c.status === 'Concluído') { tecnicos[c.tecnico].concluidos++; if (c.data_atualizacao) tecnicos[c.tecnico].tempos.push(toDate(c.data_atualizacao) - toDate(c.data_abertura)); }
        if (c.prioridade === 'Crítica') tecnicos[c.tecnico].criticos++;
        if (c.prioridade === 'Alta') tecnicos[c.tecnico].alta++;
        if (c.prioridade === 'Média') tecnicos[c.tecnico].media++;
        if (c.prioridade === 'Baixa') tecnicos[c.tecnico].baixa++;
    });
    
    Object.keys(tecnicos).forEach(t => {
        const tempos = tecnicos[t].tempos;
        tecnicos[t].tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
        tecnicos[t].taxa = tecnicos[t].total > 0 ? Math.round(tecnicos[t].concluidos / tecnicos[t].total * 100) : 0;
    });
    
    const ranking = Object.entries(tecnicos).sort((a, b) => b[1].taxa - a[1].taxa || b[1].concluidos - a[1].concluidos);
    
    let html = ranking.map(([nome, dados], index) => {
        const medalha = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
        const horas = Math.floor(dados.tempoMedio / 3600000);
        const minutos = Math.floor((dados.tempoMedio % 3600000) / 60000);
        return `<tr><td>${medalha} <strong>${sanitizar(nome)}</strong></td><td>${dados.total}</td><td>${dados.concluidos}</td><td>${dados.criticos}</td><td>${dados.alta}</td><td>${dados.media}</td><td><span style="color:${dados.taxa >= 80 ? '#10B981' : dados.taxa >= 50 ? '#F59E0B' : '#EF4444'};font-weight:700;">${dados.taxa}%</span></td><td>${dados.tempoMedio > 0 ? `${horas}h ${minutos}min` : '—'}</td></tr>`;
    }).join('');
    
    abrirModal(`
        <div class="modal-header"><h3>🏆 Desempenho dos Técnicos</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <p style="color:var(--text-secondary);margin-bottom:14px;">Período: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}</p>
        <div class="table-card"><table>
            <thead><tr><th>Técnico</th><th>Total</th><th>Concluídos</th><th>Críticos</th><th>Alta</th><th>Média</th><th>Taxa</th><th>Tempo Médio</th></tr></thead>
            <tbody>${html || '<tr><td colspan="8" style="text-align:center;">Nenhum dado</td></tr>'}</tbody>
        </table></div>
    `, '900px');
    
    window._desempenhoDados = { ranking, inicio, fim };
}

// ============================================
// SERVIÇOS POR TÉCNICO
// ============================================
function mostrarServicosTecnicos() {
    const tipo = document.getElementById('indTipo')?.value || '30';
    const { inicio, fim } = getPeriodoFiltro(tipo);
    
    const filtrados = chamados.filter(c => {
        const d = toDate(c.data_abertura);
        return !isNaN(d.getTime()) && d >= inicio && d <= fim && c.tecnico;
    });
    
    const tecnicos = {};
    filtrados.forEach(c => {
        if (!tecnicos[c.tecnico]) tecnicos[c.tecnico] = {};
        const servico = c.categoria || c.titulo || 'Não especificado';
        tecnicos[c.tecnico][servico] = (tecnicos[c.tecnico][servico] || 0) + 1;
    });
    
    let html = '';
    Object.entries(tecnicos).sort().forEach(([nome, servicos]) => {
        const total = Object.values(servicos).reduce((a, b) => a + b, 0);
        const servicosList = Object.entries(servicos).sort((a, b) => b[1] - a[1]);
        html += `<tr style="background:var(--bg);"><td colspan="4"><strong>👤 ${sanitizar(nome)}</strong> — Total: ${total} serviços</td></tr>`;
        servicosList.forEach(([servico, qtd], i) => {
            html += `<tr><td style="padding-left:20px;">${i + 1}º</td><td>${sanitizar(servico)}</td><td><strong>${qtd}</strong></td><td>${total > 0 ? Math.round(qtd / total * 100) : 0}%</td></tr>`;
        });
    });
    
    abrirModal(`
        <div class="modal-header"><h3>📋 Serviços Realizados por Técnico</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <p style="color:var(--text-secondary);margin-bottom:14px;">Período: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}</p>
        <div class="table-card"><table>
            <thead><tr><th>#</th><th>Serviço</th><th>Quantidade</th><th>%</th></tr></thead>
            <tbody>${html || '<tr><td colspan="4" style="text-align:center;">Nenhum dado</td></tr>'}</tbody>
        </table></div>
    `, '800px');
    
    window._servicosDados = { tecnicos, inicio, fim };
}

// ============================================
// EXPORTAÇÃO POWERPOINT
// ============================================
async function exportarIndicadoresPowerPoint() {
    try {
        toast('📊 Gerando apresentação PowerPoint...', 'info');
        
        const tipo = document.getElementById('indTipo')?.value || '30';
        const { inicio, fim } = getPeriodoFiltro(tipo);
        
        const filtrados = chamados.filter(c => {
            const d = toDate(c.data_abertura);
            return !isNaN(d.getTime()) && d >= inicio && d <= fim;
        });
        
        const total = filtrados.length;
        const concluidos = filtrados.filter(c => c.status === 'Concluído').length;
        const pendentes = total - concluidos;
        const criticos = filtrados.filter(c => c.prioridade === 'Crítica').length;
        const taxa = total > 0 ? Math.round(concluidos / total * 100) : 0;
        
        const aFazer = filtrados.filter(c => c.status === 'A Fazer').length;
        const emAndamento = filtrados.filter(c => c.status === 'Em Andamento').length;
        const statusPendente = filtrados.filter(c => c.status === 'Pendente').length;
        const alta = filtrados.filter(c => c.prioridade === 'Alta').length;
        const media = filtrados.filter(c => c.prioridade === 'Média').length;
        const baixa = filtrados.filter(c => c.prioridade === 'Baixa').length;
        
        const setoresData = {};
        filtrados.forEach(c => { const s = c.setor || 'Outros'; setoresData[s] = (setoresData[s] || 0) + 1; });
        const setoresOrdenados = Object.entries(setoresData).sort((a, b) => b[1] - a[1]);
        
        const categoriasData = {};
        filtrados.forEach(c => { const cat = c.categoria || 'Outros'; categoriasData[cat] = (categoriasData[cat] || 0) + 1; });
        const categoriasOrdenadas = Object.entries(categoriasData).sort((a, b) => b[1] - a[1]);
        
        const pct = (valor, totalCalc) => totalCalc > 0 ? Math.round(valor / totalCalc * 100) : 0;
        
        // Criar apresentação
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        
        const COR_PRIMARIA = '06224a';
        const COR_DOURADO = 'c8a94a';
        const COR_BRANCO = 'FFFFFF';
        
        // SLIDE 1 - CAPA
        const slide1 = pptx.addSlide();
        slide1.background = { color: COR_PRIMARIA };
        slide1.addText('HelpHosp', { x: 0.5, y: 1.5, w: '90%', h: 1.2, fontSize: 44, bold: true, color: COR_BRANCO, align: 'center' });
        slide1.addText('Relatório de Indicadores', { x: 0.5, y: 2.8, w: '90%', h: 0.8, fontSize: 24, color: COR_DOURADO, align: 'center' });
        slide1.addText(sanitizar(nomeDepto), { x: 0.5, y: 3.6, w: '90%', h: 0.6, fontSize: 18, color: COR_BRANCO, align: 'center' });
        slide1.addText(`Período: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`, { x: 0.5, y: 4.5, w: '90%', h: 0.4, fontSize: 12, color: '94A3B8', align: 'center' });
        
        // SLIDE 2 - RESUMO
        const slide2 = pptx.addSlide();
        slide2.addText('📊 Resumo Geral', { x: 0.5, y: 0.3, w: '90%', h: 0.7, fontSize: 28, bold: true, color: COR_PRIMARIA });
        
        const cards = [
            { label: 'Total', valor: total, pct: '100%', cor: COR_PRIMARIA },
            { label: 'Concluídos', valor: concluidos, pct: `${pct(concluidos, total)}%`, cor: '38A169' },
            { label: 'Pendentes', valor: pendentes, pct: `${pct(pendentes, total)}%`, cor: 'DD6B20' },
            { label: 'Críticos', valor: criticos, pct: `${pct(criticos, total)}%`, cor: 'E53E3E' },
            { label: 'Taxa Resolução', valor: `${taxa}%`, pct: '', cor: '3182CE' }
        ];
        
        cards.forEach((card, i) => {
            const x = 0.5 + (i * 2.6);
            slide2.addShape(pptx.ShapeType.roundRect, { x, y: 1.3, w: 2.3, h: 1.5, fill: { color: 'F8FAFC' }, rectRadius: 0.1, line: { color: 'E2E8F0', width: 1 } });
            slide2.addText(card.label, { x, y: 1.35, w: 2.3, h: 0.35, fontSize: 9, color: '64748B', align: 'center' });
            slide2.addText(String(card.valor), { x, y: 1.7, w: 2.3, h: 0.6, fontSize: 22, bold: true, color: card.cor, align: 'center' });
            if (card.pct) slide2.addText(card.pct, { x, y: 2.3, w: 2.3, h: 0.35, fontSize: 9, color: '64748B', align: 'center' });
        });
        
        // Tabela de status
        slide2.addText('Status dos Chamados', { x: 0.5, y: 3.2, w: '90%', h: 0.4, fontSize: 16, bold: true, color: COR_PRIMARIA });
        
        const tabelaStatus = [
            [{ text: 'Status', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: 'Qtd', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: '%', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } }],
            ['A Fazer', String(aFazer), `${pct(aFazer, total)}%`],
            ['Em Andamento', String(emAndamento), `${pct(emAndamento, total)}%`],
            ['Pendente', String(statusPendente), `${pct(statusPendente, total)}%`],
            ['Concluído', String(concluidos), `${pct(concluidos, total)}%`]
        ];
        
        slide2.addTable(tabelaStatus, { x: 0.5, y: 3.7, w: 12, fontSize: 10, border: { type: 'solid', color: 'E2E8F0' }, rowH: 0.35, colW: [6, 3, 3] });
        
        // SLIDE 3 - PRIORIDADES
        const slide3 = pptx.addSlide();
        slide3.addText('⚡ Prioridades e Setores', { x: 0.5, y: 0.3, w: '90%', h: 0.7, fontSize: 28, bold: true, color: COR_PRIMARIA });
        
        const tabelaPrioridades = [
            [{ text: 'Prioridade', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: 'Qtd', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: '%', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } }],
            ['🔴 Crítica', String(criticos), `${pct(criticos, total)}%`],
            ['🟠 Alta', String(alta), `${pct(alta, total)}%`],
            ['🟡 Média', String(media), `${pct(media, total)}%`],
            ['🟢 Baixa', String(baixa), `${pct(baixa, total)}%`]
        ];
        
        slide3.addTable(tabelaPrioridades, { x: 0.5, y: 1.3, w: 6, fontSize: 11, border: { type: 'solid', color: 'E2E8F0' }, rowH: 0.4, colW: [3, 1.5, 1.5] });
        
        // Top 5 setores
        slide3.addText('Top 5 Setores', { x: 7.5, y: 1.3, w: 5, h: 0.4, fontSize: 14, bold: true, color: COR_PRIMARIA });
        
        const tabelaSetores = [
            [{ text: 'Setor', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: 'Qtd', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: '%', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } }],
            ...setoresOrdenados.slice(0, 5).map(([s, q]) => [sanitizar(s), String(q), `${pct(q, total)}%`])
        ];
        
        slide3.addTable(tabelaSetores, { x: 7.5, y: 1.8, w: 5.5, fontSize: 10, border: { type: 'solid', color: 'E2E8F0' }, rowH: 0.35, colW: [3, 1.25, 1.25] });
        
        // Top 10 categorias
        slide3.addText('Top 10 Categorias de Problemas', { x: 0.5, y: 3.8, w: '90%', h: 0.4, fontSize: 14, bold: true, color: COR_PRIMARIA });
        
        const tabelaCategorias = [
            [{ text: 'Categoria', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: 'Qtd', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } },
             { text: '%', options: { bold: true, color: COR_BRANCO, fill: { color: COR_PRIMARIA } } }],
            ...categoriasOrdenadas.slice(0, 10).map(([cat, qtd]) => [sanitizar(cat), String(qtd), `${pct(qtd, total)}%`])
        ];
        
        slide3.addTable(tabelaCategorias, { x: 0.5, y: 4.3, w: 12, fontSize: 9, border: { type: 'solid', color: 'E2E8F0' }, rowH: 0.3, colW: [7.5, 2.25, 2.25] });
        
        // SALVAR
        const nomeArquivo = `indicadores-${new Date().toISOString().slice(0, 10)}.pptx`;
        await pptx.writeFile({ fileName: nomeArquivo });
        
        toast('✅ PowerPoint gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PowerPoint:', error);
        toast('Erro ao gerar PowerPoint: ' + error.message, 'error');
    }
}

// ============================================
// EXPORTAÇÃO PDF
// ============================================
async function exportarIndicadoresPDF() {
    try {
        toast('📄 Gerando relatório PDF...', 'info');
        
        const tipo = document.getElementById('indTipo')?.value || '30';
        const { inicio, fim } = getPeriodoFiltro(tipo);
        
        const filtrados = chamados.filter(c => {
            const d = toDate(c.data_abertura);
            return !isNaN(d.getTime()) && d >= inicio && d <= fim;
        });
        
        const total = filtrados.length;
        const concluidos = filtrados.filter(c => c.status === 'Concluído').length;
        const pendentes = total - concluidos;
        const criticos = filtrados.filter(c => c.prioridade === 'Crítica').length;
        const taxa = total > 0 ? Math.round(concluidos / total * 100) : 0;
        const pct = (valor, totalCalc) => totalCalc > 0 ? Math.round(valor / totalCalc * 100) : 0;
        
        const aFazer = filtrados.filter(c => c.status === 'A Fazer').length;
        const emAndamento = filtrados.filter(c => c.status === 'Em Andamento').length;
        const statusPendente = filtrados.filter(c => c.status === 'Pendente').length;
        const alta = filtrados.filter(c => c.prioridade === 'Alta').length;
        const media = filtrados.filter(c => c.prioridade === 'Média').length;
        const baixa = filtrados.filter(c => c.prioridade === 'Baixa').length;
        
        const setoresData = {};
        filtrados.forEach(c => { const s = c.setor || 'Outros'; setoresData[s] = (setoresData[s] || 0) + 1; });
        const setoresOrdenados = Object.entries(setoresData).sort((a, b) => b[1] - a[1]);
        
        const categoriasData = {};
        filtrados.forEach(c => { const cat = c.categoria || 'Outros'; categoriasData[cat] = (categoriasData[cat] || 0) + 1; });
        const categoriasOrdenadas = Object.entries(categoriasData).sort((a, b) => b[1] - a[1]);
        
        const el = document.createElement('div');
        el.style.cssText = 'padding:40px;background:#fff;width:1100px;position:absolute;left:-9999px;font-family:Arial;color:#1A202C;';
        
        let logosHTML = '';
        if (logoHospital || logoGoverno) {
            logosHTML = `<div style="display:flex;justify-content:center;gap:40px;margin-bottom:20px;">${logoHospital ? `<img src="${logoHospital}" style="max-height:60px;">` : ''}${logoGoverno ? `<img src="${logoGoverno}" style="max-height:60px;">` : ''}</div>`;
        }
        
        el.innerHTML = `${logosHTML}
        <div style="text-align:center;border-bottom:4px solid #06224a;padding-bottom:20px;margin-bottom:30px;">
            <h1 style="color:#06224a;font-size:28px;">HelpHosp - Relatório de Indicadores</h1>
            <h2 style="color:#3182CE;font-size:16px;">${sanitizar(nomeDepto)}</h2>
            <p style="color:#64748B;font-size:11px;">Período: ${inicio.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')} • Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        
        <h3>📊 Resumo Geral</h3>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:15px 0;">
            <div style="background:#F8FAFC;padding:14px;border-radius:10px;text-align:center;border:2px solid #E2E8F0;"><p style="color:#64748B;font-size:9px;">TOTAL</p><p style="font-size:26px;font-weight:700;">${total}</p><p style="font-size:10px;">100%</p></div>
            <div style="background:#F0FFF4;padding:14px;border-radius:10px;text-align:center;border:2px solid #C6F6D5;"><p style="color:#38A169;font-size:9px;">CONCLUÍDOS</p><p style="font-size:26px;font-weight:700;color:#38A169;">${concluidos}</p><p style="font-size:10px;color:#38A169;">${pct(concluidos, total)}%</p></div>
            <div style="background:#FFFBEB;padding:14px;border-radius:10px;text-align:center;border:2px solid #FDE68A;"><p style="color:#DD6B20;font-size:9px;">PENDENTES</p><p style="font-size:26px;font-weight:700;color:#DD6B20;">${pendentes}</p><p style="font-size:10px;color:#DD6B20;">${pct(pendentes, total)}%</p></div>
            <div style="background:#FFF5F5;padding:14px;border-radius:10px;text-align:center;border:2px solid #FED7D7;"><p style="color:#E53E3E;font-size:9px;">CRÍTICOS</p><p style="font-size:26px;font-weight:700;color:#E53E3E;">${criticos}</p><p style="font-size:10px;color:#E53E3E;">${pct(criticos, total)}%</p></div>
            <div style="background:#EFF6FF;padding:14px;border-radius:10px;text-align:center;border:2px solid #BFDBFE;"><p style="color:#3182CE;font-size:9px;">TAXA</p><p style="font-size:26px;font-weight:700;color:#3182CE;">${taxa}%</p><p style="font-size:10px;color:#3182CE;">${concluidos}/${total}</p></div>
        </div>
        
        <h3 style="margin-top:30px;">📋 Status dos Chamados</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>Status</th><th>Qtd</th><th>%</th><th>Barra</th></tr></thead>
            <tbody>
                <tr><td><span style="background:#DBEAFE;color:#1D4ED8;padding:4px 10px;border-radius:12px;">A Fazer</span></td><td style="font-weight:700;">${aFazer}</td><td>${pct(aFazer, total)}%</td><td><div style="background:#E2E8F0;border-radius:8px;height:16px;"><div style="background:#3B82F6;height:100%;width:${pct(aFazer, total)}%;border-radius:8px;"></div></div></td></tr>
                <tr><td><span style="background:#FEF3C7;color:#92400E;padding:4px 10px;border-radius:12px;">Em Andamento</span></td><td style="font-weight:700;">${emAndamento}</td><td>${pct(emAndamento, total)}%</td><td><div style="background:#E2E8F0;border-radius:8px;height:16px;"><div style="background:#F59E0B;height:100%;width:${pct(emAndamento, total)}%;border-radius:8px;"></div></div></td></tr>
                <tr><td><span style="background:#FEE2E2;color:#991B1B;padding:4px 10px;border-radius:12px;">Pendente</span></td><td style="font-weight:700;">${statusPendente}</td><td>${pct(statusPendente, total)}%</td><td><div style="background:#E2E8F0;border-radius:8px;height:16px;"><div style="background:#EF4444;height:100%;width:${pct(statusPendente, total)}%;border-radius:8px;"></div></div></td></tr>
                <tr><td><span style="background:#D1FAE5;color:#065F46;padding:4px 10px;border-radius:12px;">Concluído</span></td><td style="font-weight:700;">${concluidos}</td><td>${pct(concluidos, total)}%</td><td><div style="background:#E2E8F0;border-radius:8px;height:16px;"><div style="background:#10B981;height:100%;width:${pct(concluidos, total)}%;border-radius:8px;"></div></div></td></tr>
            </tbody>
        </table>
        
        <h3 style="margin-top:30px;">⚡ Por Prioridade</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>Prioridade</th><th>Qtd</th><th>%</th></tr></thead>
            <tbody>
                <tr><td>🔴 Crítica</td><td style="font-weight:700;">${criticos}</td><td>${pct(criticos, total)}%</td></tr>
                <tr><td>🟠 Alta</td><td style="font-weight:700;">${alta}</td><td>${pct(alta, total)}%</td></tr>
                <tr><td>🟡 Média</td><td style="font-weight:700;">${media}</td><td>${pct(media, total)}%</td></tr>
                <tr><td>🟢 Baixa</td><td style="font-weight:700;">${baixa}</td><td>${pct(baixa, total)}%</td></tr>
            </tbody>
        </table>
        
        <h3 style="margin-top:30px;">🏢 Top 10 Setores</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>#</th><th>Setor</th><th>Qtd</th><th>%</th></tr></thead>
            <tbody>${setoresOrdenados.slice(0, 10).map(([s, q], i) => `<tr><td>${i + 1}º</td><td>${sanitizar(s)}</td><td style="font-weight:700;">${q}</td><td>${pct(q, total)}%</td></tr>`).join('')}</tbody>
        </table>
        
        <h3 style="margin-top:30px;">🔧 Top 10 Categorias</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>#</th><th>Categoria</th><th>Qtd</th><th>%</th></tr></thead>
            <tbody>${categoriasOrdenadas.slice(0, 10).map(([cat, q], i) => `<tr><td>${i + 1}º</td><td>${sanitizar(cat)}</td><td style="font-weight:700;">${q}</td><td>${pct(q, total)}%</td></tr>`).join('')}</tbody>
        </table>
        
        <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #E2E8F0;color:#A0AEC0;font-size:10px;">
            <p>HelpHosp © ${new Date().getFullYear()} - Gerado por ${sanitizar(usuarioLogado.nome)}</p>
        </div>`;
        
        document.body.appendChild(el);
        const cv = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
        document.body.removeChild(el);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageHeight = 297, iw = 210;
        let heightLeft = cv.height, position = 0, page = 1;
        
        while (heightLeft > 0) {
            if (page > 1) pdf.addPage();
            const cropHeight = Math.min(cv.width * (pageHeight / iw), heightLeft);
            const pageCanvas = document.createElement('canvas');
            const pageCtx = pageCanvas.getContext('2d');
            pageCanvas.width = cv.width;
            pageCanvas.height = cropHeight;
            pageCtx.drawImage(cv, 0, position, cv.width, cropHeight, 0, 0, cv.width, cropHeight);
            pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, iw, (cropHeight * iw) / cv.width);
            heightLeft -= cropHeight;
            position += cropHeight;
            page++;
        }
        
        pdf.save(`indicadores-${new Date().toISOString().slice(0, 10)}.pdf`);
        toast('✅ PDF gerado com sucesso!', 'success');
    } catch (e) {
        console.error('Erro:', e);
        toast('Erro ao gerar PDF', 'error');
    }
}