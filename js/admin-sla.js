// ============================================
// MONITOR SLA
// ============================================

function renderSLA() {
    const main = document.getElementById('mainContent');
    const pendentes = chamados.filter(c => c.status !== 'Concluído')
        .sort((a, b) => toDate(a.data_abertura) - toDate(b.data_abertura));
    
    const noPrazo = pendentes.filter(c => getSLAStatus(c) === 'sla-ok').length;
    const proximos = pendentes.filter(c => getSLAStatus(c) === 'sla-warning').length;
    const atrasados = pendentes.filter(c => getSLAStatus(c) === 'sla-critical').length;
    
    main.innerHTML = `
    <div class="top-bar">
        <h1>⏱️ Monitor SLA</h1>
        <div style="display:flex;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="exportarSLAPDF()">
                <i class="fas fa-file-pdf"></i> Exportar
            </button>
        </div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-check-circle"></i></div>
            <div class="stat-info"><small>No Prazo</small><strong>${noPrazo}</strong></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon amber"><i class="fas fa-clock"></i></div>
            <div class="stat-info"><small>Próximos do Vencimento</small><strong>${proximos}</strong></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info"><small>Atrasados</small><strong>${atrasados}</strong></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-clipboard-list"></i></div>
            <div class="stat-info"><small>Total Pendente</small><strong>${pendentes.length}</strong></div>
        </div>
    </div>
    
    <div class="table-card">
        <table>
            <thead><tr>
                <th>Protocolo</th><th>Título</th><th>Setor</th>
                <th>Prioridade</th><th>Prazo SLA</th><th>Status SLA</th><th>Aberto há</th>
                <th>Técnico</th>
            </tr></thead>
            <tbody>
                ${pendentes.map(c => `
                <tr style="${getSLAStatus(c) === 'sla-critical' ? 'background:rgba(254,226,226,0.3);' : ''}" onclick="verDetalhes('${c.fid}')">
                    <td><strong>${sanitizar(c.protocolo || '—')}</strong></td>
                    <td>${sanitizar(c.titulo || '—')}</td>
                    <td>${sanitizar(c.setor || '—')}</td>
                    <td><span class="badge ${getPrioridadeClass(c.prioridade)}">${sanitizar(c.prioridade || '—')}</span></td>
                    <td>${c.prioridade === 'Crítica' ? '1 hora' : c.prioridade === 'Alta' ? '4 horas' : c.prioridade === 'Média' ? '24 horas' : '48 horas'}</td>
                    <td><span class="sla-alert ${getSLAStatus(c)}">${getSLATexto(c)}</span></td>
                    <td>${fmtDataCurta(c.data_abertura)}</td>
                    <td>${sanitizar(c.tecnico || '—')}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="chart-card" style="margin-top:20px;">
        <h3>📊 Distribuição SLA</h3>
        <canvas id="graficoSLA" style="height:250px!important;"></canvas>
    </div>`;
    
    // Gráfico SLA
    setTimeout(() => {
        const ctx = document.getElementById('graficoSLA');
        if (ctx) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['No Prazo', 'Próximos', 'Atrasados'],
                    datasets: [{
                        data: [noPrazo, proximos, atrasados],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 15 } }
                    }
                }
            });
        }
    }, 100);
}

async function exportarSLAPDF() {
    try {
        toast('📄 Gerando relatório SLA...', 'info');
        
        const pendentes = chamados.filter(c => c.status !== 'Concluído');
        const atrasados = pendentes.filter(c => getSLAStatus(c) === 'sla-critical');
        
        const el = document.createElement('div');
        el.style.cssText = 'padding:40px;background:#fff;width:1000px;position:absolute;left:-9999px;font-family:Arial;';
        
        let logosHTML = '';
        if (logoHospital || logoGoverno) {
            logosHTML = `<div style="display:flex;justify-content:center;gap:40px;margin-bottom:20px;">${logoHospital ? `<img src="${logoHospital}" style="max-height:60px;">` : ''}${logoGoverno ? `<img src="${logoGoverno}" style="max-height:60px;">` : ''}</div>`;
        }
        
        el.innerHTML = `${logosHTML}
        <div style="text-align:center;border-bottom:4px solid #06224a;padding-bottom:20px;margin-bottom:30px;">
            <h1 style="color:#06224a;">HelpHosp - Relatório SLA</h1>
            <h2 style="color:#3182CE;">${sanitizar(nomeDepto)}</h2>
            <p>${new Date().toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'})}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0;">
            <div style="background:#D1FAE5;padding:20px;border-radius:12px;text-align:center;"><p>NO PRAZO</p><p style="font-size:32px;font-weight:700;">${pendentes.filter(c => getSLAStatus(c) === 'sla-ok').length}</p></div>
            <div style="background:#FEF3C7;padding:20px;border-radius:12px;text-align:center;"><p>PRÓXIMOS</p><p style="font-size:32px;font-weight:700;">${pendentes.filter(c => getSLAStatus(c) === 'sla-warning').length}</p></div>
            <div style="background:#FEE2E2;padding:20px;border-radius:12px;text-align:center;"><p>ATRASADOS</p><p style="font-size:32px;font-weight:700;">${atrasados.length}</p></div>
        </div>
        <h3 style="color:#E53E3E;">🚨 Chamados Atrasados (${atrasados.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>Protocolo</th><th>Título</th><th>Setor</th><th>Prioridade</th><th>Aberto há</th></tr></thead>
            <tbody>${atrasados.map(c => `<tr><td>${c.protocolo || '—'}</td><td>${c.titulo || '—'}</td><td>${c.setor || '—'}</td><td>${c.prioridade || '—'}</td><td>${fmtDataCurta(c.data_abertura)}</td></tr>`).join('')}</tbody>
        </table>`;
        
        document.body.appendChild(el);
        const cv = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
        document.body.removeChild(el);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const iw = 210, ih = (cv.height * iw) / cv.width;
        pdf.addImage(cv.toDataURL('image/png'), 'PNG', 0, 0, iw, ih);
        pdf.save(`relatorio-sla-${new Date().toISOString().slice(0, 10)}.pdf`);
        toast('✅ Relatório SLA gerado!', 'success');
    } catch (e) {
        console.error('Erro:', e);
        toast('Erro ao gerar PDF', 'error');
    }
}