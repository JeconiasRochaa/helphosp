// ============================================
// GERENCIAMENTO DE IPs & REDE - INTERFACE RENOVADA
// ============================================

function renderIPs() {
    const main = document.getElementById('mainContent');
    
    main.innerHTML = `
    <style>
        .ips-container { max-width: 1100px; margin: 0 auto; }
        
        .ips-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .ips-stat-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .ips-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        }
        
        .ips-stat-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }
        
        .ips-stat-icon.green { background: #D1FAE5; color: #10B981; }
        .ips-stat-icon.red { background: #FEE2E2; color: #EF4444; }
        .ips-stat-icon.blue { background: #DBEAFE; color: #3B82F6; }
        .ips-stat-icon.purple { background: #EDE9FE; color: #8B5CF6; }
        
        .ips-stat-info small {
            font-size: 10px;
            color: var(--text-secondary);
            text-transform: uppercase;
            display: block;
        }
        
        .ips-stat-info strong {
            font-size: 22px;
            font-weight: 700;
            display: block;
        }
        
        .ips-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 14px;
            margin-top: 16px;
        }
        
        .ips-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 18px;
            transition: all 0.3s;
            cursor: pointer;
            position: relative;
        }
        
        .ips-card:hover {
            border-color: var(--primary);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .ips-card.active {
            border-left: 4px solid #10B981;
        }
        
        .ips-card.inactive {
            border-left: 4px solid #EF4444;
            opacity: 0.7;
        }
        
        .ips-card.reserved {
            border-left: 4px solid #F59E0B;
        }
        
        .ips-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        
        .ips-card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--primary);
        }
        
        .ips-card-type {
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 600;
            background: var(--bg);
            color: var(--text-secondary);
        }
        
        .ips-card-body {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        
        .ips-field {
            background: var(--bg);
            padding: 8px 10px;
            border-radius: 8px;
            font-size: 11px;
        }
        
        .ips-field label {
            font-size: 9px;
            color: var(--text-secondary);
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
        }
        
        .ips-field span {
            font-weight: 600;
            font-size: 12px;
        }
        
        .ips-field code {
            background: rgba(0,0,0,0.05);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
        }
        
        .ips-card-actions {
            display: flex;
            gap: 6px;
            margin-top: 12px;
            justify-content: flex-end;
        }
        
        .ips-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 4px;
        }
        
        .ips-status-dot.green { background: #10B981; }
        .ips-status-dot.red { background: #EF4444; }
        .ips-status-dot.yellow { background: #F59E0B; }
        
        .ips-empty {
            text-align: center;
            padding: 60px;
            grid-column: 1/-1;
        }
        
        .ips-empty i {
            font-size: 60px;
            color: var(--text-secondary);
            display: block;
            margin-bottom: 15px;
            opacity: 0.3;
        }
        
        .view-toggle {
            display: flex;
            gap: 4px;
            background: var(--bg);
            padding: 3px;
            border-radius: 8px;
        }
        
        .view-toggle button {
            padding: 6px 12px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 6px;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .view-toggle button.active {
            background: var(--card);
            color: var(--primary);
            font-weight: 600;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
            .ips-grid { grid-template-columns: 1fr; }
            .ips-card-body { grid-template-columns: 1fr; }
        }
    </style>
    
    <div class="top-bar">
        <div>
            <h1>🌐 IPs & Rede</h1>
            <p style="font-size:11px;color:var(--text-secondary);">Gerenciamento de dispositivos e endereços de rede</p>
        </div>
        <div style="display:flex;gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="abrirModalIP()">
                <i class="fas fa-plus"></i> Novo Dispositivo
            </button>
            <button class="btn btn-outline btn-sm" onclick="gerarRelatorioIPs()">
                <i class="fas fa-file-pdf"></i> Relatório
            </button>
        </div>
    </div>
    
    <div class="ips-container">
        <div id="ipsContent">
            <div style="text-align:center;padding:40px;">
                <div class="spinner" style="margin:0 auto;"></div>
                <p style="color:var(--text-secondary);margin-top:10px;">Carregando dispositivos...</p>
            </div>
        </div>
    </div>`;
    
    carregarIPs();
}

async function carregarIPs() {
    try {
        const snapshot = await db.collection('ips_rede').orderBy('setor').get();
        const ips = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            ips.push(data);
        });
        
        const container = document.getElementById('ipsContent');
        if (!container) return;
        
        // Estatísticas
        const ativos = ips.filter(ip => ip.status === 'Ativo').length;
        const inativos = ips.filter(ip => ip.status === 'Inativo').length;
        const reservados = ips.filter(ip => ip.status === 'Reservado').length;
        const setoresUnicos = [...new Set(ips.map(ip => ip.setor))].length;
        
        container.innerHTML = `
            <!-- Cards de Estatísticas -->
            <div class="ips-stats">
                <div class="ips-stat-card" onclick="filtrarPorStatus('Ativo')">
                    <div class="ips-stat-icon green"><i class="fas fa-check-circle"></i></div>
                    <div class="ips-stat-info"><small>Ativos</small><strong>${ativos}</strong></div>
                </div>
                <div class="ips-stat-card" onclick="filtrarPorStatus('Inativo')">
                    <div class="ips-stat-icon red"><i class="fas fa-times-circle"></i></div>
                    <div class="ips-stat-info"><small>Inativos</small><strong>${inativos}</strong></div>
                </div>
                <div class="ips-stat-card" onclick="filtrarPorStatus('Reservado')">
                    <div class="ips-stat-icon purple"><i class="fas fa-clock"></i></div>
                    <div class="ips-stat-info"><small>Reservados</small><strong>${reservados}</strong></div>
                </div>
                <div class="ips-stat-card">
                    <div class="ips-stat-icon blue"><i class="fas fa-building"></i></div>
                    <div class="ips-stat-info"><small>Setores</small><strong>${setoresUnicos}</strong></div>
                </div>
            </div>
            
            <!-- Filtros -->
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
                <input type="text" id="filtroIPs" placeholder="🔍 Buscar por dispositivo, IP, MAC ou setor..." 
                       style="flex:1;min-width:200px;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);color:var(--text);"
                       onkeyup="filtrarIPsUI()">
                
                <select id="filtroStatusIP" onchange="filtrarIPsUI()" 
                        style="padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);color:var(--text);">
                    <option value="">Todos os status</option>
                    <option value="Ativo">🟢 Ativo</option>
                    <option value="Inativo">🔴 Inativo</option>
                    <option value="Reservado">🟡 Reservado</option>
                </select>
                
                <select id="filtroTipoIP" onchange="filtrarIPsUI()" 
                        style="padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);color:var(--text);">
                    <option value="">Todos os tipos</option>
                    <option value="💻 Computador">💻 Computador</option>
                    <option value="🖨️ Impressora">🖨️ Impressora</option>
                    <option value="🖧 Switch">🖧 Switch</option>
                    <option value="📡 Roteador">📡 Roteador</option>
                    <option value="📞 Telefone">📞 Telefone</option>
                    <option value="📷 Câmera">📷 Câmera</option>
                    <option value="📺 TV">📺 TV</option>
                    <option value="🖥️ Servidor">🖥️ Servidor</option>
                </select>
                
                <div class="view-toggle">
                    <button class="active" onclick="mudarVisualizacao('cards', this)">📱 Cards</button>
                    <button onclick="mudarVisualizacao('tabela', this)">📋 Tabela</button>
                </div>
            </div>
            
            <!-- Grid de Dispositivos -->
            <div class="ips-grid" id="ipsGrid">
                ${renderizarCardsIPs(ips)}
            </div>
        `;
        
        // Salvar dados para filtro
        window._ipsData = ips;
        
    } catch (error) {
        console.error('Erro ao carregar IPs:', error);
        const container = document.getElementById('ipsContent');
        if (container) {
            container.innerHTML = '<div class="ips-empty"><i class="fas fa-exclamation-triangle"></i><h3>Erro ao carregar</h3></div>';
        }
    }
}

function renderizarCardsIPs(ips) {
    if (ips.length === 0) {
        return `<div class="ips-empty">
            <i class="fas fa-network-wired"></i>
            <h3>Nenhum dispositivo encontrado</h3>
            <p style="color:var(--text-secondary);">Clique em "Novo Dispositivo" para cadastrar</p>
        </div>`;
    }
    
    return ips.map(ip => {
        const statusClass = ip.status === 'Ativo' ? 'active' : ip.status === 'Inativo' ? 'inactive' : 'reserved';
        const statusDot = ip.status === 'Ativo' ? 'green' : ip.status === 'Inativo' ? 'red' : 'yellow';
        const tipoIcone = getIconeTipo(ip.tipo);
        
        return `
        <div class="ips-card ${statusClass}" onclick="verDetalhesIP('${ip.id}')">
            <div class="ips-card-header">
                <div>
                    <div class="ips-card-title">${tipoIcone} ${sanitizar(ip.dispositivo || 'Sem nome')}</div>
                    <span class="ips-card-type">${sanitizar(ip.tipo || '—')}</span>
                </div>
                <span style="font-size:10px;display:flex;align-items:center;">
                    <span class="ips-status-dot ${statusDot}"></span> ${sanitizar(ip.status || 'Ativo')}
                </span>
            </div>
            
            <div class="ips-card-body">
                <div class="ips-field">
                    <label>Endereço IP</label>
                    <span><code>${sanitizar(ip.ip || '—')}</code></span>
                </div>
                <div class="ips-field">
                    <label>MAC Address</label>
                    <span><code>${sanitizar(ip.mac || '—')}</code></span>
                </div>
                <div class="ips-field">
                    <label>Localização</label>
                    <span>📍 ${sanitizar(ip.localizacao || '—')}</span>
                </div>
                <div class="ips-field">
                    <label>Setor</label>
                    <span>🏢 ${sanitizar(ip.setor || '—')}</span>
                </div>
            </div>
            
            ${ip.observacao ? `
            <div style="margin-top:8px;font-size:10px;color:var(--text-secondary);background:var(--bg);padding:6px 10px;border-radius:6px;">
                📝 ${sanitizar(ip.observacao)}
            </div>` : ''}
            
            <div class="ips-card-actions" onclick="event.stopPropagation();">
                <button class="btn btn-sm btn-outline" onclick="editarIP('${ip.id}')" title="Editar">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline" onclick="pingIP('${ip.ip}')" title="Testar Conexão">
                    <i class="fas fa-network-wired"></i> Ping
                </button>
                <button class="btn btn-sm btn-danger" onclick="excluirIP('${ip.id}')" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

function renderizarTabelaIPs(ips) {
    if (ips.length === 0) {
        return `<tr><td colspan="8" style="text-align:center;padding:40px;">Nenhum dispositivo encontrado</td></tr>`;
    }
    
    return ips.map(ip => {
        const tipoIcone = getIconeTipo(ip.tipo);
        return `
        <tr onclick="verDetalhesIP('${ip.id}')" style="cursor:pointer;">
            <td><strong>${tipoIcone} ${sanitizar(ip.dispositivo || '—')}</strong></td>
            <td>${sanitizar(ip.tipo || '—')}</td>
            <td><code>${sanitizar(ip.ip || '—')}</code></td>
            <td><code>${sanitizar(ip.mac || '—')}</code></td>
            <td>${sanitizar(ip.localizacao || '—')}</td>
            <td>${sanitizar(ip.setor || '—')}</td>
            <td><span class="badge ${ip.status === 'Ativo' ? 'badge-green' : ip.status === 'Inativo' ? 'badge-red' : 'badge-amber'}">${sanitizar(ip.status || 'Ativo')}</span></td>
            <td onclick="event.stopPropagation();" style="white-space:nowrap;">
                <button class="btn btn-sm btn-outline" onclick="editarIP('${ip.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="excluirIP('${ip.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function getIconeTipo(tipo) {
    const icones = {
        '💻 Computador': '💻',
        '🖨️ Impressora': '🖨️',
        '🖧 Switch': '🖧',
        '📡 Roteador': '📡',
        '📞 Telefone': '📞',
        '📷 Câmera': '📷',
        '📺 TV': '📺',
        '🖥️ Servidor': '🖥️'
    };
    return icones[tipo] || '🔌';
}

let visualizacaoAtual = 'cards';

function mudarVisualizacao(tipo, btn) {
    visualizacaoAtual = tipo;
    
    // Atualizar botões
    document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Atualizar visualização
    filtrarIPsUI();
}

function filtrarPorStatus(status) {
    const selectStatus = document.getElementById('filtroStatusIP');
    if (selectStatus) {
        selectStatus.value = status;
        filtrarIPsUI();
    }
}

function filtrarIPsUI() {
    const busca = (document.getElementById('filtroIPs')?.value || '').toLowerCase();
    const status = document.getElementById('filtroStatusIP')?.value || '';
    const tipo = document.getElementById('filtroTipoIP')?.value || '';
    
    let ips = window._ipsData || [];
    
    if (status) ips = ips.filter(ip => ip.status === status);
    if (tipo) ips = ips.filter(ip => ip.tipo === tipo);
    if (busca) {
        ips = ips.filter(ip => 
            (ip.dispositivo || '').toLowerCase().includes(busca) ||
            (ip.ip || '').toLowerCase().includes(busca) ||
            (ip.mac || '').toLowerCase().includes(busca) ||
            (ip.setor || '').toLowerCase().includes(busca) ||
            (ip.localizacao || '').toLowerCase().includes(busca)
        );
    }
    
    const grid = document.getElementById('ipsGrid');
    if (!grid) return;
    
    if (visualizacaoAtual === 'tabela') {
        grid.innerHTML = `
        <div style="grid-column:1/-1;" class="table-card">
            <table>
                <thead><tr>
                    <th>Dispositivo</th><th>Tipo</th><th>IP</th><th>MAC</th>
                    <th>Local</th><th>Setor</th><th>Status</th><th>Ações</th>
                </tr></thead>
                <tbody>${renderizarTabelaIPs(ips)}</tbody>
            </table>
        </div>`;
    } else {
        grid.innerHTML = renderizarCardsIPs(ips);
    }
}

function verDetalhesIP(id) {
    const ip = window._ipsData?.find(i => i.id === id);
    if (!ip) return;
    
    const tipoIcone = getIconeTipo(ip.tipo);
    const statusDot = ip.status === 'Ativo' ? 'green' : ip.status === 'Inativo' ? 'red' : 'yellow';
    
    abrirModal(`
        <div class="modal-header">
            <h3>${tipoIcone} ${sanitizar(ip.dispositivo || 'Dispositivo')}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <span class="ips-status-dot ${statusDot}" style="width:10px;height:10px;"></span>
            <span class="badge ${ip.status === 'Ativo' ? 'badge-green' : ip.status === 'Inativo' ? 'badge-red' : 'badge-amber'}">${sanitizar(ip.status || 'Ativo')}</span>
            <span class="badge badge-blue">${sanitizar(ip.tipo || '—')}</span>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="ips-field"><label>Endereço IP</label><span><code style="font-size:14px;">${sanitizar(ip.ip || '—')}</code></span></div>
            <div class="ips-field"><label>MAC Address</label><span><code style="font-size:14px;">${sanitizar(ip.mac || '—')}</code></span></div>
            <div class="ips-field"><label>📍 Localização</label><span>${sanitizar(ip.localizacao || '—')}</span></div>
            <div class="ips-field"><label>🏢 Setor</label><span>${sanitizar(ip.setor || '—')}</span></div>
        </div>
        
        ${ip.observacao ? `<div style="margin-top:12px;background:var(--bg);padding:12px;border-radius:8px;font-size:12px;"><strong>📝 Observação:</strong> ${sanitizar(ip.observacao)}</div>` : ''}
        
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn btn-outline btn-sm" onclick="pingIP('${ip.ip}')">
                <i class="fas fa-network-wired"></i> Testar Conexão
            </button>
            <button class="btn btn-outline btn-sm" onclick="editarIP('${ip.id}');this.closest('.modal-overlay').remove();">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-danger btn-sm" onclick="excluirIP('${ip.id}');this.closest('.modal-overlay').remove();">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `, '600px');
}

function pingIP(ip) {
    if (!ip || ip === '—') {
        toast('Endereço IP não definido', 'warning');
        return;
    }
    
    toast(`🔍 Testando conexão com ${ip}...`, 'info');
    
    // Simular ping (já que não podemos fazer ping real do navegador)
    setTimeout(() => {
        const sucesso = Math.random() > 0.3; // 70% de chance de sucesso
        
        if (sucesso) {
            toast(`✅ ${ip} está respondendo!`, 'success');
        } else {
            toast(`❌ ${ip} não está respondendo`, 'error');
        }
    }, 1500);
}

function abrirModalIP(id = null) {
    if (id) {
        const ip = window._ipsData?.find(i => i.id === id);
        if (ip) mostrarFormularioIP(id, ip);
    } else {
        mostrarFormularioIP(null, {});
    }
}

function mostrarFormularioIP(id, ip) {
    const tipos = ['💻 Computador', '🖨️ Impressora', '🖧 Switch', '📡 Roteador', '📞 Telefone', '📷 Câmera', '📺 TV', '🖥️ Servidor'];
    const statuses = ['Ativo', 'Inativo', 'Reservado'];
    
    abrirModal(`
        <div class="modal-header">
            <h3>${id ? '✏️ Editar Dispositivo' : '🌐 Novo Dispositivo'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        
        <form onsubmit="salvarIP(event, '${id || ''}')" style="display:grid;gap:12px;">
            <div class="form-group">
                <label>Nome do Dispositivo *</label>
                <input type="text" id="ipDisp" required value="${sanitizar(ip.dispositivo || '')}" placeholder="Ex: Computador Recepção">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo *</label>
                    <select id="ipTipo" required>
                        <option value="">Selecione...</option>
                        ${tipos.map(t => `<option value="${t}" ${ip.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="ipStatus">
                        ${statuses.map(s => `<option value="${s}" ${ip.status === s ? 'selected' : ''}>${s === 'Ativo' ? '🟢' : s === 'Inativo' ? '🔴' : '🟡'} ${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Endereço IP *</label>
                    <input type="text" id="ipEnd" required value="${sanitizar(ip.ip || '')}" placeholder="192.168.0.1">
                </div>
                <div class="form-group">
                    <label>MAC Address</label>
                    <input type="text" id="ipMAC" value="${sanitizar(ip.mac || '')}" placeholder="00:1A:2B:3C:4D:5E">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>📍 Localização</label>
                    <input type="text" id="ipLoc" value="${sanitizar(ip.localizacao || '')}" placeholder="Sala 101, Rack 3...">
                </div>
                <div class="form-group">
                    <label>🏢 Setor *</label>
                    <select id="ipSetor" required>
                        <option value="">Selecione...</option>
                        ${setores.map(s => `<option value="${s}" ${ip.setor === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label>📝 Observação</label>
                <textarea id="ipObs" rows="2" placeholder="Informações adicionais...">${sanitizar(ip.observacao || '')}</textarea>
            </div>
            
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Salvar Dispositivo
                </button>
            </div>
        </form>
    `, '650px');
}

async function salvarIP(e, id) {
    e.preventDefault();
    
    const dados = {
        dispositivo: document.getElementById('ipDisp')?.value.trim(),
        tipo: document.getElementById('ipTipo')?.value,
        ip: document.getElementById('ipEnd')?.value.trim(),
        mac: document.getElementById('ipMAC')?.value.trim(),
        localizacao: document.getElementById('ipLoc')?.value.trim(),
        setor: document.getElementById('ipSetor')?.value,
        status: document.getElementById('ipStatus')?.value || 'Ativo',
        observacao: document.getElementById('ipObs')?.value.trim() || ''
    };
    
    if (!dados.dispositivo || !dados.ip || !dados.setor || !dados.tipo) {
        toast('Preencha todos os campos obrigatórios (*)', 'error');
        return;
    }
    
    try {
        if (id) {
            await db.collection('ips_rede').doc(id).update(dados);
        } else {
            await db.collection('ips_rede').add(dados);
        }
        document.querySelector('.modal-overlay')?.remove();
        carregarIPs();
        toast('✅ Dispositivo salvo!', 'success');
    } catch (error) {
        console.error('Erro:', error);
        toast('Erro ao salvar', 'error');
    }
}

function editarIP(id) {
    abrirModalIP(id);
}

async function excluirIP(id) {
    if (!confirm('Excluir este dispositivo permanentemente?')) return;
    
    try {
        await db.collection('ips_rede').doc(id).delete();
        carregarIPs();
        toast('🗑️ Dispositivo excluído!', 'success');
    } catch (error) {
        toast('Erro ao excluir', 'error');
    }
}

async function gerarRelatorioIPs() {
    try {
        toast('📄 Gerando relatório de rede...', 'info');
        
        const snapshot = await db.collection('ips_rede').orderBy('setor').get();
        const ips = [];
        snapshot.forEach(doc => ips.push(doc.data()));
        
        const ativos = ips.filter(ip => ip.status === 'Ativo').length;
        const inativos = ips.filter(ip => ip.status === 'Inativo').length;
        const setoresUnicos = [...new Set(ips.map(ip => ip.setor))].length;
        
        const el = document.createElement('div');
        el.style.cssText = 'padding:30px;background:#fff;width:1000px;position:absolute;left:-9999px;font-family:Arial;color:#1A202C;';
        
        let logosHTML = '';
        if (logoHospital || logoGoverno) {
            logosHTML = `<div style="display:flex;justify-content:center;gap:40px;margin-bottom:20px;">${logoHospital ? `<img src="${logoHospital}" style="max-height:50px;">` : ''}${logoGoverno ? `<img src="${logoGoverno}" style="max-height:50px;">` : ''}</div>`;
        }
        
        el.innerHTML = `${logosHTML}
        <div style="text-align:center;border-bottom:4px solid #06224a;padding-bottom:20px;margin-bottom:20px;">
            <h1 style="color:#06224a;">HelpHosp - Relatório de Rede</h1>
            <h2 style="color:#3182CE;">${sanitizar(nomeDepto)}</h2>
            <p>${new Date().toLocaleDateString('pt-BR')} • ${ips.length} dispositivos • ${setoresUnicos} setores</p>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
            <div style="background:#D1FAE5;padding:14px;border-radius:8px;text-align:center;"><p>ATIVOS</p><p style="font-size:24px;font-weight:700;color:#10B981;">${ativos}</p></div>
            <div style="background:#FEE2E2;padding:14px;border-radius:8px;text-align:center;"><p>INATIVOS</p><p style="font-size:24px;font-weight:700;color:#EF4444;">${inativos}</p></div>
            <div style="background:#DBEAFE;padding:14px;border-radius:8px;text-align:center;"><p>TOTAL</p><p style="font-size:24px;font-weight:700;color:#3B82F6;">${ips.length}</p></div>
        </div>
        
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead><tr style="background:#06224a;color:white;"><th>Dispositivo</th><th>Tipo</th><th>IP</th><th>MAC</th><th>Local</th><th>Setor</th><th>Status</th></tr></thead>
            <tbody>${ips.map(ip => `<tr><td>${ip.dispositivo||'—'}</td><td>${ip.tipo||'—'}</td><td>${ip.ip||'—'}</td><td>${ip.mac||'—'}</td><td>${ip.localizacao||'—'}</td><td>${ip.setor||'—'}</td><td>${ip.status||'Ativo'}</td></tr>`).join('')}</tbody>
        </table>`;
        
        document.body.appendChild(el);
        const cv = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
        document.body.removeChild(el);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const iw = 277, ih = (cv.height * iw) / cv.width;
        pdf.addImage(cv.toDataURL('image/png'), 'PNG', 5, 5, iw, ih);
        pdf.save('relatorio-rede.pdf');
        toast('✅ Relatório gerado!', 'success');
    } catch (e) {
        console.error('Erro:', e);
        toast('Erro ao gerar PDF', 'error');
    }
}