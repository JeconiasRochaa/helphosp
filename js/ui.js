// ============================================
// INTERFACE DO PORTAL PÚBLICO
// ============================================

/**
 * Renderiza o grid de departamentos
 */
function renderizarActionGrid(departamentos) {
    const grid = document.getElementById('actionGrid');
    if (!grid) return;
    
    let html = '';
    
    departamentos.forEach((dep, index) => {
        const info = DEPARTAMENTO_INFO[dep] || {
            icone: 'fa-building',
            titulo: `📋 ${dep}`,
            descricao: `Chamados para ${dep}`
        };
        const corClasse = CORES_DEPARTAMENTO[index % CORES_DEPARTAMENTO.length];
        
        html += `
        <div class="action-card card-${corClasse}" onclick="window.app.abrirFormulario('${dep}')">
            <div class="card-icon">
                <i class="fas ${info.icone}"></i>
            </div>
            <h3>${info.titulo}</h3>
            <p>${info.descricao}</p>
        </div>`;
    });
    
    // Card GestHosp
    html += `
    <div class="action-card card-gesthosp" onclick="window.app.abrirGestHosp()">
        <div class="card-icon">
            <i class="fas fa-user-plus"></i>
        </div>
        <h3>Cadastro GestHosp</h3>
        <p>Solicitar cadastro de profissional</p>
    </div>`;
    
    // Card Meus Chamados
    html += `
    <div class="action-card card-meus-chamados" onclick="window.app.mostrarMeusChamados()">
        <div class="card-icon">
            <i class="fas fa-clipboard-list"></i>
        </div>
        <h3>Meus Chamados</h3>
        <p>Chamados de hoje e pendentes</p>
    </div>`;
    
    grid.innerHTML = html;
}

/**
 * Preenche o select de setores
 */
function preencherSetores(setoresLista) {
    const selectSetor = document.getElementById('setor');
    if (!selectSetor) return;
    
    selectSetor.innerHTML = '<option value="">Selecione o setor...</option>';
    setoresLista.forEach(setor => {
        selectSetor.innerHTML += `<option value="${setor}">${setor}</option>`;
    });
}

/**
 * Preenche estados brasileiros
 */
function preencherEstados() {
    const selectEstado = document.getElementById('ghEstado');
    if (!selectEstado) return;
    
    selectEstado.innerHTML = '<option value="">Selecione...</option>';
    ESTADOS_BRASIL.forEach(estado => {
        selectEstado.innerHTML += `<option value="${estado.sigla}">${estado.nome}</option>`;
    });
}

/**
 * Renderiza contatos de suporte
 */
function renderizarContatos(contatos) {
    const container = document.getElementById('contatosSuporte');
    if (!container) return;
    
    if (!contatos || contatos.length === 0) {
        container.innerHTML = '<span style="color:var(--gray);font-size:12px;">Nenhum técnico disponível no momento</span>';
        return;
    }
    
    let html = '';
    contatos.forEach(contato => {
        const deptoTipo = contato.departamento === 'MANUTENCAO' ? 'manutencao' : 'ti';
        const deptoNome = contato.departamento === 'MANUTENCAO' ? 'MANUTENÇÃO' : 'TI';
        const avatarIcon = contato.departamento === 'MANUTENCAO' ? '🔧' : '🖥️';
        
        html += `
        <a href="https://wa.me/55${contato.whatsapp}" target="_blank" class="contato-card">
            <div class="contato-avatar">${avatarIcon}</div>
            <div style="flex:1;">
                <strong>${contato.nome}</strong>
                <small>${contato.cargo}</small>
            </div>
            <span class="depto-tag depto-${deptoTipo}">${deptoNome}</span>
        </a>`;
    });
    
    container.innerHTML = html;
}

/**
 * Renderiza lista de chamados
 */
function renderizarListaChamados(chamados) {
    const lista = document.getElementById('listaChamados');
    if (!lista) return;
    
    if (!chamados || chamados.length === 0) {
        lista.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--gray);">
            <div style="font-size:40px;">📭</div>
            <h3>Nenhum chamado hoje</h3>
            <p>Os chamados abertos aparecerão aqui</p>
        </div>`;
        return;
    }
    
    let html = `<p style="font-size:11px;color:var(--gray);margin-bottom:10px;">📋 ${chamados.length} chamado(s) encontrado(s)</p>`;
    
    chamados.forEach(chamado => {
        const data = chamado.data_abertura?.toDate ? chamado.data_abertura.toDate() : new Date();
        const statusClass = 'status-' + (chamado.status || 'A Fazer').toLowerCase().replace(/ /g, '');
        const icon = chamado.tipo === 'gesthosp' ? '🏥' : chamado.departamento === 'MANUTENCAO' ? '🔧' : '🖥️';
        const concluidoClass = chamado.status === 'Concluído' ? ' concluido' : '';
        
        html += `
        <div class="chamado-card${concluidoClass}" onclick="window.app.verDetalhes('${chamado.id}')">
            <div style="flex:1;min-width:200px;">
                <strong>${icon} ${chamado.titulo || 'Sem título'}${chamado.status === 'Concluído' ? ' ✓' : ''}</strong>
                <br>
                <small>
                    📋 ${chamado.protocolo || '—'} | 
                    📍 ${chamado.setor || '—'} | 
                    🕐 ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} | 
                    🏢 ${chamado.departamento || 'TI'}
                </small>
            </div>
            <span class="status-badge ${statusClass}">${chamado.status || 'A Fazer'}</span>
        </div>`;
    });
    
    lista.innerHTML = html;
}

/**
 * Renderiza detalhes no modal
 */
function renderizarDetalhesChamado(chamado) {
    const conteudo = document.getElementById('detalhesConteudo');
    if (!conteudo) return;
    
    const data = chamado.data_abertura?.toDate ? chamado.data_abertura.toDate() : new Date();
    const statusClass = 'status-' + (chamado.status || 'A Fazer').toLowerCase().replace(/ /g, '');
    
    const timeline = (chamado.timeline || []).map(t => `
        <div style="padding:5px 0;border-bottom:1px solid #eee;font-size:10px;">
            <strong>${new Date(t.data).toLocaleString('pt-BR')}</strong>
            <br>${t.acao || ''}
        </div>
    `).join('');
    
    if (chamado.tipo === 'gesthosp') {
        conteudo.innerHTML = `
        <h3>🏥 Solicitação de Cadastro</h3>
        <span class="status-badge ${statusClass}">${chamado.status || '—'}</span>
        <p style="margin-top:10px;"><strong>📋 Protocolo:</strong> ${chamado.protocolo || '—'}</p>
        <p><strong>📅 Data:</strong> ${data.toLocaleString('pt-BR')}</p>
        <div style="background:#FFF5F5;padding:10px;border-radius:8px;margin-top:10px;">
            <p style="color:#E53E3E;font-size:11px;">🔒 Dados protegidos pela LGPD</p>
        </div>
        <hr>
        <h4>📜 Andamento</h4>
        ${timeline || '<p style="color:var(--gray);">Nenhum evento registrado</p>'}`;
    } else {
        conteudo.innerHTML = `
        <h3>${chamado.titulo || 'Sem título'}</h3>
        <span class="status-badge ${statusClass}">${chamado.status || '—'}</span>
        <div style="display:grid;gap:4px;margin-top:10px;font-size:11px;">
            <p><strong>📋 Protocolo:</strong> ${chamado.protocolo || '—'}</p>
            <p><strong>👤 Solicitante:</strong> ${chamado.solicitante || '—'}</p>
            <p><strong>📍 Setor:</strong> ${chamado.setor || '—'}</p>
            <p><strong>⚡ Prioridade:</strong> ${chamado.prioridade || '—'}</p>
            <p><strong>📅 Data:</strong> ${data.toLocaleString('pt-BR')}</p>
            <p><strong>🏢 Departamento:</strong> ${chamado.departamento || 'TI'}</p>
        </div>
        ${chamado.descricao ? `<hr><h4>📝 Descrição</h4><p style="white-space:pre-wrap;font-size:12px;">${chamado.descricao}</p>` : ''}
        <hr>
        <h4>📜 Andamento</h4>
        ${timeline || '<p style="color:var(--gray);">Nenhum evento registrado</p>'}`;
    }
    
    document.getElementById('modalDetalhes').classList.add('ativo');
}

/**
 * Mostra notificação toast
 */
function mostrarToast(mensagem, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    const cores = {
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--danger)'
    };
    
    const icones = {
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    
    toast.style.borderLeftColor = cores[tipo] || cores.success;
    toast.innerHTML = `
        <span>${icones[tipo] || '✅'}</span> 
        <strong>${tipo === 'success' ? 'Sucesso' : tipo === 'warning' ? 'Atenção' : 'Erro'}</strong>
        <br>
        <span style="font-size:11px;color:var(--gray);">${mensagem}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

/**
 * Alterna suporte
 */
function toggleSuporte() {
    const contatos = document.getElementById('contatosSuporte');
    const seta = document.getElementById('setaSuporte');
    
    if (contatos && seta) {
        contatos.classList.toggle('open');
        seta.classList.toggle('open');
    }
}

/**
 * Fecha modal
 */
function fecharModal() {
    document.getElementById('modalDetalhes').classList.remove('ativo');
}

/**
 * Toggle loading do botão
 */
function toggleBotaoLoading(id, loading, textoOriginal = '') {
    const botao = document.getElementById(id);
    if (!botao) return;
    
    if (loading) {
        botao.disabled = true;
        botao.dataset.textoOriginal = botao.innerHTML;
        botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    } else {
        botao.disabled = false;
        botao.innerHTML = textoOriginal || botao.dataset.textoOriginal || botao.innerHTML;
    }
}