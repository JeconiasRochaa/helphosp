// ============================================
// DASHBOARD PROFISSIONAL (SEM FILTROS)
// ============================================

function renderDashboard() {
    const main = document.getElementById('mainContent');
    const p = getPerms();
    
    // Estatísticas do inventário (apenas TI)
    let te = 0, tc = 0, ti = 0, tEst = 0;
    if (p.isTI || p.isAdmin) {
        inventario.forEach(i => {
            tc += parseInt(i.computadores) || 0;
            ti += parseInt(i.impressoras) || 0;
            te += (parseInt(i.computadores) || 0) + (parseInt(i.impressoras) || 0) + 
                  (parseInt(i.ramais) || 0) + (parseInt(i.tvs) || 0) + 
                  (parseInt(i.redes) || 0) + (parseInt(i.outros) || 0);
        });
        tEst = estoque.reduce((s, e) => s + (parseInt(e.quantidade) || 0), 0);
    }
    
    // Estatísticas gerais dos chamados
    const totalChamados = chamados.length;
    const abertos = chamados.filter(c => c.status !== 'Concluído').length;
    const concluidos = chamados.filter(c => c.status === 'Concluído').length;
    const criticos = chamados.filter(c => c.prioridade === 'Crítica' && c.status !== 'Concluído').length;
    const taxaResolucao = totalChamados > 0 ? Math.round(concluidos / totalChamados * 100) : 0;
    
    // Chamados de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const chamadosHoje = chamados.filter(c => toDate(c.data_abertura) >= hoje);
    const resolvidosHoje = chamadosHoje.filter(c => c.status === 'Concluído').length;
    
    // Últimos serviços realizados
    const ultimosServicos = chamados
        .filter(c => c.status === 'Concluído')
        .sort((a, b) => toDate(b.data_atualizacao || b.data_abertura) - toDate(a.data_atualizacao || a.data_abertura))
        .slice(0, 10);
    
    // Chamados críticos pendentes
    const criticosPendentes = chamados
        .filter(c => c.prioridade === 'Crítica' && c.status !== 'Concluído')
        .sort((a, b) => toDate(a.data_abertura) - toDate(b.data_abertura));
    
    // Stats do inventário (apenas TI)
    let statsHTML = '';
    if (p.isTI || p.isAdmin) {
        statsHTML = `
        <div class="stats-grid">
            <div class="stat-card" onclick="navegar('inventario', document.querySelector('[data-secao=inventario]'))">
                <div class="stat-icon purple"><i class="fas fa-desktop"></i></div>
                <div class="stat-info"><small>Total Equipamentos</small><strong>${te}</strong></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-laptop"></i></div>
                <div class="stat-info"><small>Computadores</small><strong>${tc}</strong></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-print"></i></div>
                <div class="stat-info"><small>Impressoras</small><strong>${ti}</strong></div>
            </div>
            <div class="stat-card" onclick="navegar('estoque', document.querySelector('[data-secao=estoque]'))">
                <div class="stat-icon amber"><i class="fas fa-box"></i></div>
                <div class="stat-info"><small>Itens em Estoque</small><strong>${tEst}</strong></div>
            </div>
        </div>`;
    }
    
    main.innerHTML = `
    <!-- Cabeçalho -->
    <div class="top-bar">
        <div>
            <h1>📊 Dashboard</h1>
            <p style="font-size:11px;color:var(--text-secondary);margin-top:2px;">
                ${sanitizar(nomeDepto)} • ${new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
            </p>
        </div>
    </div>
    
    <!-- Cards de Resumo -->
    <div class="info-bar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px;">
        <div class="info-item" style="background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;">
            <div class="info-val">${totalChamados}</div>
            <div class="info-lbl">Total de Chamados</div>
        </div>
        <div class="info-item" style="background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;">
            <div class="info-val" style="color:#FBD38D;">${abertos}</div>
            <div class="info-lbl">Em Aberto</div>
        </div>
        <div class="info-item" style="background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;">
            <div class="info-val" style="color:#68D391;">${concluidos}</div>
            <div class="info-lbl">Concluídos</div>
        </div>
        <div class="info-item" style="background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;">
            <div class="info-val" style="color:#FC8181;">${criticos}</div>
            <div class="info-lbl">Críticos Pendentes</div>
        </div>
        <div class="info-item" style="background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;">
            <div class="info-val" style="color:#63B3ED;">${taxaResolucao}%</div>
            <div class="info-lbl">Taxa de Resolução</div>
        </div>
        <div class="info-item" style="background:rgba(255,255,255,0.1);padding:12px;border-radius:10px;">
            <div class="info-val" style="color:#B794F4;">${chamadosHoje.length}</div>
            <div class="info-lbl">Chamados Hoje</div>
        </div>
    </div>
    
    ${statsHTML}
    
    <!-- Grid Principal -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <!-- Gráfico de Status -->
        <div class="chart-card">
            <h3>📈 Distribuição por Status</h3>
            <canvas id="graficoStatusDash" style="height:280px!important;"></canvas>
        </div>
        
        <!-- Últimos Serviços Realizados -->
        <div class="chart-card">
            <h3>✅ Últimos Serviços Realizados</h3>
            <div style="max-height:280px;overflow-y:auto;">
                ${ultimosServicos.length === 0 ? 
                    '<div style="text-align:center;padding:40px;color:var(--text-secondary);"><i class="fas fa-inbox" style="font-size:40px;display:block;margin-bottom:10px;"></i>Nenhum serviço concluído</div>' :
                    ultimosServicos.map((c, i) => `
                    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--border);cursor:pointer;transition:all 0.2s;" 
                         onclick="verDetalhes('${c.fid}')"
                         onmouseover="this.style.background='var(--bg)'"
                         onmouseout="this.style.background='transparent'">
                        <div style="width:36px;height:36px;border-radius:10px;background:#D1FAE5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-check-circle" style="color:#10B981;font-size:16px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <strong style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizar(c.titulo || 'Sem título')}</strong>
                            <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">
                                📍 ${sanitizar(c.setor || '—')} • 👤 ${sanitizar(c.tecnico || '—')} • 🕐 ${fmtDataCurta(c.data_atualizacao || c.data_abertura)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    
    <!-- Grid Secundário -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <!-- Chamados por Setor -->
        <div class="chart-card">
            <h3>🏢 Setores com Mais Chamados</h3>
            <canvas id="graficoSetorDash" style="height:280px!important;"></canvas>
        </div>
        
        <!-- Chamados Críticos Pendentes -->
        <div class="chart-card">
            <h3>🚨 Chamados Críticos Pendentes</h3>
            <div style="max-height:280px;overflow-y:auto;">
                ${criticosPendentes.length === 0 ?
                    '<div style="text-align:center;padding:40px;color:#10B981;"><i class="fas fa-check-circle" style="font-size:40px;display:block;margin-bottom:10px;"></i>✅ Nenhum chamado crítico pendente!</div>' :
                    criticosPendentes.map(c => `
                    <div style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--border);background:rgba(254,226,226,0.3);border-radius:8px;margin-bottom:6px;cursor:pointer;animation:pulseWarning 2s infinite;"
                         onclick="verDetalhes('${c.fid}')">
                        <div style="width:36px;height:36px;border-radius:10px;background:#FEE2E2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-exclamation-triangle" style="color:#EF4444;font-size:16px;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <strong style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizar(c.titulo || 'Sem título')}</strong>
                            <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">
                                📍 ${sanitizar(c.setor || '—')} • 🕐 ${fmtDataCurta(c.data_abertura)} • 👤 ${sanitizar(c.solicitante || '—')}
                            </div>
                        </div>
                        <span class="badge badge-red" style="flex-shrink:0;">CRÍTICO</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    
    <!-- Tabela de Chamados Recentes -->
    <div class="table-card">
        <h3>📋 Chamados Recentes</h3>
        <table>
            <thead><tr>
                <th>Protocolo</th>
                <th>Data</th>
                <th>Título</th>
                <th>Solicitante</th>
                <th>Setor</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Técnico</th>
            </tr></thead>
            <tbody>
                ${chamados.sort((a, b) => toDate(b.data_abertura) - toDate(a.data_abertura)).slice(0, 15).map(c => `
                <tr onclick="verDetalhes('${c.fid}')" style="cursor:pointer;">
                    <td><strong>${sanitizar(c.protocolo || '—')}</strong></td>
                    <td>${fmtDataCurta(c.data_abertura)}</td>
                    <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizar(c.titulo || '—')}</td>
                    <td>${sanitizar(c.solicitante || '—')}</td>
                    <td>${sanitizar(c.setor || '—')}</td>
                    <td><span class="badge ${getPrioridadeClass(c.prioridade)}">${sanitizar(c.prioridade || '—')}</span></td>
                    <td><span class="badge ${getStatusClass(c.status)}">${sanitizar(c.status || '—')}</span></td>
                    <td>${sanitizar(c.tecnico || '—')}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
    
    // Renderizar gráficos
    renderizarGraficosDashboard();
}

function renderizarGraficosDashboard() {
    // Destruir gráficos anteriores
    Object.values(charts).forEach(c => { if (c) c.destroy(); });
    charts = {};
    
    // Gráfico de Status (Donut)
    const statusData = {
        'A Fazer': chamados.filter(c => c.status === 'A Fazer').length,
        'Em Andamento': chamados.filter(c => c.status === 'Em Andamento').length,
        'Pendente': chamados.filter(c => c.status === 'Pendente').length,
        'Concluído': chamados.filter(c => c.status === 'Concluído').length
    };
    
    const ctx1 = document.getElementById('graficoStatusDash');
    if (ctx1) {
        charts.statusDash = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#3B82F6', '#F59E0B', '#EF4444', '#10B981'],
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            padding: 20, 
                            usePointStyle: true,
                            font: { size: 11 }
                        } 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round(ctx.raw / total * 100) : 0;
                                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico de Setores (Top 5)
    const setoresData = {};
    chamados.forEach(c => {
        const s = c.setor || 'Outros';
        setoresData[s] = (setoresData[s] || 0) + 1;
    });
    
    const sorted = Object.entries(setoresData).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const ctx2 = document.getElementById('graficoSetorDash');
    if (ctx2) {
        charts.setorDash = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: sorted.map(e => e[0]),
                datasets: [{
                    label: 'Chamados',
                    data: sorted.map(e => e[1]),
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
                    borderWidth: 0,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    x: { 
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    } 
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ` ${ctx.raw} chamado(s)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// Manter compatibilidade - função chamada pelo listener
function atualizarDashboard() {
    // O dashboard agora é estático, sem filtros
    // Esta função existe apenas para compatibilidade
    console.log('📊 Dashboard atualizado em tempo real');
}