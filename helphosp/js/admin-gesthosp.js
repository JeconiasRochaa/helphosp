// ============================================
// GESTHOSP - SOLICITAÇÕES DE CADASTRO
// ============================================

function renderGestHosp() {
    const main = document.getElementById('mainContent');
    const gh = chamados.filter(c => c.tipo === 'gesthosp');
    
    let l = '<tr><td colspan="8" style="text-align:center;padding:20px;">📭 Nenhuma solicitação de cadastro</td></tr>';
    
    if (gh.length > 0) {
        l = gh.map(c => {
            let d = {};
            try {
                if (c.descricao) d = typeof c.descricao === 'string' ? JSON.parse(c.descricao) : c.descricao;
            } catch (e) { d = {}; }
            
            return `<tr onclick="verDetalhes('${c.fid}')">
                <td><strong>${sanitizar(c.protocolo || '—')}</strong></td>
                <td>${fmtDataCurta(c.data_abertura)}</td>
                <td><strong>${sanitizar(d.nome || '—')}</strong></td>
                <td>${sanitizar(d.cpf || '—')}</td>
                <td>${sanitizar(d.profissao || d.cargo || '—')}</td>
                <td>${sanitizar(d.setor || c.setor || '—')}</td>
                <td><span class="badge ${c.status === 'Concluído' ? 'badge-green' : 'badge-blue'}">${sanitizar(c.status || '—')}</span></td>
                <td onclick="event.stopPropagation();">
                    <button class="btn btn-sm btn-primary" onclick="avancarStatus('${c.fid}')">▶</button>
                    ${getPerms().isAdmin ? `<button class="btn btn-sm btn-danger" onclick="excluirChamado('${c.fid}')">🗑️</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    }
    
    main.innerHTML = `
    <div class="top-bar">
        <h1>🏥 GestHosp - Solicitações de Cadastro</h1>
        <div style="display:flex;gap:6px;">
            <span class="badge badge-blue">${gh.length} solicitações</span>
        </div>
    </div>
    <div class="filtros-bar">
        <select id="filtroGestHosp" onchange="filtrarGestHospUI()">
            <option value="">Todos os status</option>
            <option value="A Fazer">A Fazer</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
        </select>
    </div>
    <div class="table-card">
        <table>
            <thead><tr>
                <th>Protocolo</th><th>Data</th><th>Profissional</th>
                <th>CPF</th><th>Profissão</th><th>Setor</th>
                <th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody id="tabelaGestHosp">${l}</tbody>
        </table>
    </div>`;
}

function filtrarGestHospUI() {
    const filtro = document.getElementById('filtroGestHosp')?.value || '';
    let gh = chamados.filter(c => c.tipo === 'gesthosp');
    
    if (filtro) {
        gh = gh.filter(c => c.status === filtro);
    }
    
    const tb = document.getElementById('tabelaGestHosp');
    if (!tb) return;
    
    if (gh.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">📭 Nenhuma solicitação encontrada</td></tr>';
        return;
    }
    
    tb.innerHTML = gh.map(c => {
        let d = {};
        try {
            if (c.descricao) d = typeof c.descricao === 'string' ? JSON.parse(c.descricao) : c.descricao;
        } catch (e) { d = {}; }
        
        return `<tr onclick="verDetalhes('${c.fid}')">
            <td><strong>${sanitizar(c.protocolo || '—')}</strong></td>
            <td>${fmtDataCurta(c.data_abertura)}</td>
            <td><strong>${sanitizar(d.nome || '—')}</strong></td>
            <td>${sanitizar(d.cpf || '—')}</td>
            <td>${sanitizar(d.profissao || d.cargo || '—')}</td>
            <td>${sanitizar(d.setor || c.setor || '—')}</td>
            <td><span class="badge ${c.status === 'Concluído' ? 'badge-green' : 'badge-blue'}">${sanitizar(c.status || '—')}</span></td>
            <td onclick="event.stopPropagation();">
                <button class="btn btn-sm btn-primary" onclick="avancarStatus('${c.fid}')">▶</button>
                ${getPerms().isAdmin ? `<button class="btn btn-sm btn-danger" onclick="excluirChamado('${c.fid}')">🗑️</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}