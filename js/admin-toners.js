// ============================================
// MONITOR DE TONERS PROFISSIONAL
// ============================================

function renderToners() {
    const main = document.getElementById('mainContent');
    
    // Buscar todas as trocas de toner
    const tonerChamados = chamados.filter(c => c.tipo === 'toner')
        .sort((a, b) => toDate(b.data_troca_toner || b.data_abertura) - toDate(a.data_troca_toner || a.data_abertura));
    
    // Última troca por setor
    const ultimasTrocas = {};
    tonerChamados.forEach(t => {
        const s = t.setor;
        if (!ultimasTrocas[s]) ultimasTrocas[s] = t;
    });
    
    // Estatísticas gerais
    const totalTrocas = tonerChamados.length;
    const preventivas = tonerChamados.filter(t => t.tipo_troca === 'preventiva').length;
    const necessarias = tonerChamados.filter(t => t.tipo_troca === 'necessaria').length;
    const setoresCriticos = SETORES_TONERS.filter(s => {
        const ult = ultimasTrocas[s];
        if (!ult) return true; // Nunca trocou
        const dias = Math.floor((new Date() - toDate(ult.data_troca_toner || ult.data_abertura)) / 86400000);
        return dias > 90;
    }).length;
    
    // Tabela principal
    const linhas = SETORES_TONERS.map(s => {
        const ult = ultimasTrocas[s];
        
        if (!ult) {
            return `
            <tr style="background:#FFF5F5;">
                <td><strong>${s}</strong></td>
                <td colspan="2" style="text-align:center;color:#E53E3E;">⚠️ Nunca trocado</td>
                <td style="text-align:center;">—</td>
                <td style="text-align:center;color:#E53E3E;font-weight:700;">🔴 Crítico</td>
                <td>—</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="registrarTrocaTonerSetor('${s}')">
                        <i class="fas fa-sync-alt"></i> Trocar
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="verHistoricoSetor('${s}')">
                        <i class="fas fa-history"></i> Histórico
                    </button>
                </td>
            </tr>`;
        }
        
        const dataTroca = toDate(ult.data_troca_toner || ult.data_abertura);
        const dias = Math.floor((new Date() - dataTroca) / 86400000);
        
        let statusClass, statusTexto, rowStyle;
        if (dias > 90) {
            statusClass = 'color:#E53E3E;';
            statusTexto = '🔴 Crítico';
            rowStyle = 'background:#FFF5F5;';
        } else if (dias > 60) {
            statusClass = 'color:#DD6B20;';
            statusTexto = '🟡 Atenção';
            rowStyle = 'background:#FFFBEB;';
        } else {
            statusClass = 'color:#38A169;';
            statusTexto = '🟢 Normal';
            rowStyle = '';
        }
        
        return `
        <tr style="${rowStyle}">
            <td><strong>${s}</strong></td>
            <td>${dataTroca.toLocaleDateString('pt-BR')} <small style="color:var(--text-secondary);">${dataTroca.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small></td>
            <td>${sanitizar(ult.solicitante || ult.tecnico || '—')}</td>
            <td style="text-align:center;">${ult.tipo_troca === 'preventiva' ? '🟢 Preventiva' : '🔴 Necessária'}</td>
            <td style="text-align:center;${statusClass}font-weight:700;">${dias} dias</td>
            <td style="text-align:center;font-weight:600;">${statusTexto}</td>
            <td style="font-size:10px;max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${sanitizar(ult.observacao || '')}">${sanitizar(ult.observacao || '—')}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="registrarTrocaTonerSetor('${s}')">
                    <i class="fas fa-sync-alt"></i> Trocar
                </button>
                <button class="btn btn-sm btn-outline" onclick="verHistoricoSetor('${s}')">
                    <i class="fas fa-history"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
    
    main.innerHTML = `
    <div class="top-bar">
        <div>
            <h1>🖨️ Monitor de Toners</h1>
            <p style="font-size:11px;color:var(--text-secondary);margin-top:2px;">
                ${SETORES_TONERS.length} setores monitorados • ${new Date().toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'})}
            </p>
        </div>
        <div style="display:flex;gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="abrirModalToner()">
                <i class="fas fa-plus"></i> Nova Troca
            </button>
            <button class="btn btn-outline btn-sm" onclick="verHistoricoCompleto()">
                <i class="fas fa-history"></i> Histórico Completo
            </button>
            <button class="btn btn-outline btn-sm" onclick="gerarRelatorioToners()">
                <i class="fas fa-file-pdf"></i> Relatório
            </button>
        </div>
    </div>
    
    <!-- Cards de Resumo -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-sync-alt"></i></div>
            <div class="stat-info"><small>Total de Trocas</small><strong>${totalTrocas}</strong></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-shield-alt"></i></div>
            <div class="stat-info"><small>Preventivas</small><strong>${preventivas}</strong></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon amber"><i class="fas fa-exclamation-circle"></i></div>
            <div class="stat-info"><small>Necessárias</small><strong>${necessarias}</strong></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info"><small>Setores Críticos</small><strong>${setoresCriticos}</strong></div>
        </div>
    </div>
    
    <!-- Tabela Principal -->
    <div class="table-card">
        <h3>📋 Status Atual dos Setores</h3>
        <div style="display:flex;gap:8px;margin-bottom:12px;font-size:10px;color:var(--text-secondary);">
            <span>🟢 Normal: até 60 dias</span>
            <span>🟡 Atenção: 60-90 dias</span>
            <span>🔴 Crítico: mais de 90 dias</span>
        </div>
        <table>
            <thead><tr>
                <th>Setor</th>
                <th>Última Troca</th>
                <th>Técnico</th>
                <th>Tipo</th>
                <th>Dias</th>
                <th>Status</th>
                <th>Observação</th>
                <th style="width:140px;">Ações</th>
            </tr></thead>
            <tbody>${linhas}</tbody>
        </table>
    </div>`;
}

// ============================================
// MODAL DE REGISTRO DE TROCA
// ============================================
function abrirModalToner(setor = '') {
    abrirModal(`
        <div class="modal-header">
            <h3>🖨️ Registrar Troca de Toner</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <form onsubmit="registrarTrocaToner(event)" style="display:grid;gap:10px;">
            <div class="form-group">
                <label>Setor *</label>
                <select id="tonerSetor" required>
                    <option value="">Selecione o setor...</option>
                    ${SETORES_TONERS.map(s => `<option value="${s}" ${s === setor ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo de Troca *</label>
                    <select id="tonerTipo" required>
                        <option value="preventiva">🟢 Preventiva (Programada)</option>
                        <option value="necessaria">🔴 Necessária (Sob Demanda)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Técnico Responsável *</label>
                    <input type="text" id="tonerTecnico" value="${usuarioLogado.nome}" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Modelo do Toner</label>
                    <input type="text" id="tonerModelo" placeholder="Ex: HP 26A, Samsung MLT-D101S...">
                </div>
                <div class="form-group">
                    <label>Nº de Série/Lote</label>
                    <input type="text" id="tonerLote" placeholder="Opcional">
                </div>
            </div>
            
            <div class="form-group">
                <label>Observação</label>
                <textarea id="tonerObs" rows="2" placeholder="Detalhes da troca, condição do equipamento, etc..."></textarea>
            </div>
            
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Registrar Troca
                </button>
            </div>
        </form>
    `);
}

function registrarTrocaTonerSetor(s) {
    abrirModalToner(s);
}

async function registrarTrocaToner(e) {
    e.preventDefault();
    
    const setor = document.getElementById('tonerSetor')?.value;
    const tipo = document.getElementById('tonerTipo')?.value;
    const tecnico = document.getElementById('tonerTecnico')?.value.trim() || usuarioLogado.nome;
    const modelo = document.getElementById('tonerModelo')?.value.trim();
    const lote = document.getElementById('tonerLote')?.value.trim();
    const obs = document.getElementById('tonerObs')?.value.trim();
    
    if (!setor) {
        toast('Selecione o setor', 'error');
        return;
    }
    
    try {
        const dadosToner = {
            protocolo: 'TN-' + Date.now().toString(36).toUpperCase(),
            setor: setor,
            tipo: 'toner',
            isToner: true,
            status: 'Concluído',
            solicitante: tecnico,
            tecnico: tecnico,
            departamento: depto,
            titulo: `Troca de toner — ${setor}`,
            tipo_troca: tipo,
            modelo_toner: modelo,
            lote: lote,
            observacao: obs,
            data_abertura: firebase.firestore.Timestamp.now(),
            data_troca_toner: firebase.firestore.Timestamp.now()
        };
        
        await db.collection('chamados').add(dadosToner);
        document.querySelector('.modal-overlay')?.remove();
        toast('✅ Troca de toner registrada com sucesso!', 'success');
        renderToners();
    } catch (e) {
        console.error('Erro:', e);
        toast('Erro ao registrar troca', 'error');
    }
}

// ============================================
// HISTÓRICO POR SETOR
// ============================================
function verHistoricoSetor(setor) {
    const historico = chamados
        .filter(c => c.tipo === 'toner' && c.setor === setor)
        .sort((a, b) => toDate(b.data_troca_toner || b.data_abertura) - toDate(a.data_troca_toner || a.data_abertura));
    
    let html = '';
    if (historico.length === 0) {
        html = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">📭 Nenhum histórico de troca para este setor</div>';
    } else {
        // Agrupar por ano/mês
        const agrupado = {};
        historico.forEach(h => {
            const data = toDate(h.data_troca_toner || h.data_abertura);
            const chave = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            if (!agrupado[chave]) agrupado[chave] = [];
            agrupado[chave].push(h);
        });
        
        Object.entries(agrupado).forEach(([mes, trocas]) => {
            html += `<h4 style="color:var(--primary);margin:16px 0 8px 0;border-bottom:2px solid var(--border);padding-bottom:6px;">📅 ${mes} (${trocas.length} troca(s))</h4>`;
            
            trocas.forEach((t, i) => {
                const data = toDate(t.data_troca_toner || t.data_abertura);
                const iconeTipo = t.tipo_troca === 'preventiva' ? '🟢' : '🔴';
                
                html += `
                <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px;">
                        <div style="flex:1;min-width:200px;">
                            <strong style="font-size:14px;">${iconeTipo} Troca #${i + 1}</strong>
                            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">
                                📅 ${data.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'})} às ${data.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </div>
                            <div style="font-size:11px;color:var(--text-secondary);">
                                👤 Técnico: <strong>${sanitizar(t.tecnico || t.solicitante || '—')}</strong>
                            </div>
                            ${t.modelo_toner ? `<div style="font-size:11px;color:var(--text-secondary);">🖨️ Modelo: ${sanitizar(t.modelo_toner)}</div>` : ''}
                            ${t.lote ? `<div style="font-size:11px;color:var(--text-secondary);">📦 Lote: ${sanitizar(t.lote)}</div>` : ''}
                            ${t.observacao ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">📝 ${sanitizar(t.observacao)}</div>` : ''}
                        </div>
                        <span class="badge ${t.tipo_troca === 'preventiva' ? 'badge-green' : 'badge-amber'}" style="flex-shrink:0;">
                            ${t.tipo_troca === 'preventiva' ? 'Preventiva' : 'Necessária'}
                        </span>
                    </div>
                </div>`;
            });
        });
    }
    
    abrirModal(`
        <div class="modal-header">
            <h3>📋 Histórico de Trocas — ${sanitizar(setor)}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <p style="color:var(--text-secondary);margin-bottom:12px;">
            Total de trocas: <strong>${historico.length}</strong> | 
            Preventivas: <strong>${historico.filter(h => h.tipo_troca === 'preventiva').length}</strong> | 
            Necessárias: <strong>${historico.filter(h => h.tipo_troca === 'necessaria').length}</strong>
        </p>
        <div style="max-height:60vh;overflow-y:auto;">${html}</div>
    `, '700px');
}

// ============================================
// HISTÓRICO COMPLETO
// ============================================
function verHistoricoCompleto() {
    const historico = chamados
        .filter(c => c.tipo === 'toner')
        .sort((a, b) => toDate(b.data_troca_toner || b.data_abertura) - toDate(a.data_troca_toner || a.data_abertura));
    
    if (historico.length === 0) {
        toast('Nenhum histórico de troca encontrado', 'info');
        return;
    }
    
    // Agrupar por técnico
    const porTecnico = {};
    historico.forEach(h => {
        const tec = h.tecnico || h.solicitante || 'Não identificado';
        if (!porTecnico[tec]) porTecnico[tec] = [];
        porTecnico[tec].push(h);
    });
    
    // Agrupar por mês
    const porMes = {};
    historico.forEach(h => {
        const data = toDate(h.data_troca_toner || h.data_abertura);
        const chave = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (!porMes[chave]) porMes[chave] = [];
        porMes[chave].push(h);
    });
    
    let htmlTecnicos = '';
    Object.entries(porTecnico).sort((a, b) => b[1].length - a[1].length).forEach(([tec, trocas]) => {
        htmlTecnicos += `
        <tr>
            <td><strong>${sanitizar(tec)}</strong></td>
            <td>${trocas.length}</td>
            <td>${trocas.filter(t => t.tipo_troca === 'preventiva').length}</td>
            <td>${trocas.filter(t => t.tipo_troca === 'necessaria').length}</td>
            <td>${trocas.map(t => t.setor).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</td>
        </tr>`;
    });
    
    let htmlMensal = '';
    Object.entries(porMes).forEach(([mes, trocas]) => {
        htmlMensal += `
        <tr>
            <td><strong>${mes}</strong></td>
            <td>${trocas.length}</td>
            <td>${trocas.filter(t => t.tipo_troca === 'preventiva').length}</td>
            <td>${trocas.filter(t => t.tipo_troca === 'necessaria').length}</td>
        </tr>`;
    });
    
    abrirModal(`
        <div class="modal-header">
            <h3>📊 Histórico Completo de Toners</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        
        <p style="color:var(--text-secondary);margin-bottom:16px;">
            Total de trocas: <strong>${historico.length}</strong> | 
            Setores: <strong>${SETORES_TONERS.length}</strong> | 
            Técnicos: <strong>${Object.keys(porTecnico).length}</strong>
        </p>
        
        <h4 style="color:var(--primary);margin-bottom:8px;">👤 Por Técnico</h4>
        <div class="table-card" style="margin-bottom:20px;">
            <table>
                <thead><tr>
                    <th>Técnico</th><th>Total</th><th>Preventivas</th><th>Necessárias</th><th>Setores</th>
                </tr></thead>
                <tbody>${htmlTecnicos}</tbody>
            </table>
        </div>
        
        <h4 style="color:var(--primary);margin-bottom:8px;">📅 Por Mês</h4>
        <div class="table-card">
            <table>
                <thead><tr>
                    <th>Mês/Ano</th><th>Total</th><th>Preventivas</th><th>Necessárias</th>
                </tr></thead>
                <tbody>${htmlMensal}</tbody>
            </table>
        </div>
        
        <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:12px;">
            <button class="btn btn-primary btn-sm" onclick="gerarRelatorioToners()">
                <i class="fas fa-file-pdf"></i> Exportar Relatório
            </button>
        </div>
    `, '800px');
}

// ============================================
// RELATÓRIO PDF
// ============================================
async function gerarRelatorioToners() {
    try {
        toast('📄 Gerando relatório de toners...', 'info');
        
        const tonerChamados = chamados.filter(c => c.tipo === 'toner')
            .sort((a, b) => toDate(b.data_troca_toner || b.data_abertura) - toDate(a.data_troca_toner || a.data_abertura));
        
        const ultimas = {};
        tonerChamados.forEach(t => {
            const s = t.setor;
            if (!ultimas[s]) ultimas[s] = t;
        });
        
        const porTecnico = {};
        tonerChamados.forEach(h => {
            const tec = h.tecnico || h.solicitante || 'Não identificado';
            if (!porTecnico[tec]) porTecnico[tec] = { total: 0, preventivas: 0, necessarias: 0 };
            porTecnico[tec].total++;
            if (h.tipo_troca === 'preventiva') porTecnico[tec].preventivas++;
            else porTecnico[tec].necessarias++;
        });
        
        const el = document.createElement('div');
        el.style.cssText = 'padding:40px;background:#fff;width:1000px;position:absolute;left:-9999px;font-family:Arial;color:#1A202C;';
        
        let logosHTML = '';
        if (logoHospital || logoGoverno) {
            logosHTML = `<div style="display:flex;justify-content:center;gap:40px;margin-bottom:20px;">${logoHospital ? `<img src="${logoHospital}" style="max-height:60px;">` : ''}${logoGoverno ? `<img src="${logoGoverno}" style="max-height:60px;">` : ''}</div>`;
        }
        
        el.innerHTML = `${logosHTML}
        <div style="text-align:center;border-bottom:4px solid #06224a;padding-bottom:20px;margin-bottom:30px;">
            <h1 style="color:#06224a;font-size:28px;">HelpHosp</h1>
            <h2 style="color:#3182CE;font-size:18px;">Relatório de Monitoramento de Toners</h2>
            <p style="color:#64748B;">Gerado em ${new Date().toLocaleString('pt-BR')} • ${sanitizar(nomeDepto)}</p>
        </div>
        
        <h3 style="color:#06224a;border-bottom:2px solid #E2E8F0;padding-bottom:8px;">📊 Resumo</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0;">
            <div style="background:#F8FAFC;padding:16px;border-radius:10px;text-align:center;border:2px solid #E2E8F0;">
                <p style="color:#64748B;font-size:10px;">Total de Trocas</p>
                <p style="font-size:28px;font-weight:700;">${tonerChamados.length}</p>
            </div>
            <div style="background:#F0FFF4;padding:16px;border-radius:10px;text-align:center;border:2px solid #C6F6D5;">
                <p style="color:#38A169;font-size:10px;">Preventivas</p>
                <p style="font-size:28px;font-weight:700;color:#38A169;">${tonerChamados.filter(t => t.tipo_troca === 'preventiva').length}</p>
            </div>
            <div style="background:#FFF5F5;padding:16px;border-radius:10px;text-align:center;border:2px solid #FED7D7;">
                <p style="color:#E53E3E;font-size:10px;">Necessárias</p>
                <p style="font-size:28px;font-weight:700;color:#E53E3E;">${tonerChamados.filter(t => t.tipo_troca === 'necessaria').length}</p>
            </div>
        </div>
        
        <h3 style="color:#06224a;border-bottom:2px solid #E2E8F0;padding-bottom:8px;margin-top:30px;">📋 Status Atual dos Setores</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>Setor</th><th>Última Troca</th><th>Técnico</th><th>Tipo</th><th>Dias</th><th>Status</th></tr></thead>
            <tbody>${SETORES_TONERS.map(s => {
                const ult = ultimas[s];
                if (!ult) return `<tr><td>${s}</td><td colspan="5" style="color:#E53E3E;">⚠️ Nunca trocado</td></tr>`;
                const d = toDate(ult.data_troca_toner || ult.data_abertura);
                const dias = Math.floor((new Date() - d) / 86400000);
                return `<tr><td>${s}</td><td>${d.toLocaleDateString('pt-BR')}</td><td>${ult.solicitante || ult.tecnico || '—'}</td><td>${ult.tipo_troca === 'preventiva' ? 'Preventiva' : 'Necessária'}</td><td>${dias}</td><td style="color:${dias > 90 ? '#E53E3E' : dias > 60 ? '#DD6B20' : '#38A169'};font-weight:700;">${dias > 90 ? 'Crítico' : dias > 60 ? 'Atenção' : 'Normal'}</td></tr>`;
            }).join('')}</tbody>
        </table>
        
        <h3 style="color:#06224a;border-bottom:2px solid #E2E8F0;padding-bottom:8px;margin-top:30px;">👤 Por Técnico</h3>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
            <thead><tr style="background:#06224a;color:white;"><th>Técnico</th><th>Total</th><th>Preventivas</th><th>Necessárias</th></tr></thead>
            <tbody>${Object.entries(porTecnico).sort((a,b) => b[1].total - a[1].total).map(([nome, d]) => `<tr><td>${nome}</td><td>${d.total}</td><td>${d.preventivas}</td><td>${d.necessarias}</td></tr>`).join('')}</tbody>
        </table>`;
        
        document.body.appendChild(el);
        const cv = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
        document.body.removeChild(el);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const iw = 210, ih = (cv.height * iw) / cv.width;
        pdf.addImage(cv.toDataURL('image/png'), 'PNG', 0, 0, iw, ih);
        pdf.save(`relatorio-toners-${new Date().toISOString().slice(0, 10)}.pdf`);
        toast('✅ Relatório de toners gerado!', 'success');
    } catch (e) {
        console.error('Erro:', e);
        toast('Erro ao gerar relatório', 'error');
    }
}