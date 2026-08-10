// ============================================
// CONFIGURAÇÕES DO SISTEMA - INTERFACE RENOVADA
// ============================================

async function renderConfig() {
    const main = document.getElementById('mainContent');
    await loadConfig();
    
    main.innerHTML = `
    <style>
        .config-container { max-width: 900px; margin: 0 auto; }
        
        .config-tabs {
            display: flex;
            gap: 4px;
            background: var(--bg);
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .config-tab {
            padding: 10px 18px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        }
        
        .config-tab:hover {
            color: var(--text);
            background: rgba(0,0,0,0.05);
        }
        
        .config-tab.active {
            background: var(--card);
            color: var(--primary);
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .config-panel {
            display: none;
            background: var(--card);
            border-radius: 16px;
            padding: 24px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
        }
        
        .config-panel.active {
            display: block;
            animation: fadeSlideIn 0.3s ease;
        }
        
        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .config-panel h3 {
            font-size: 18px;
            color: var(--primary);
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--border);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .config-panel h3 i {
            color: var(--gold, #c8a94a);
        }
        
        .config-card {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            transition: all 0.3s;
        }
        
        .config-card:hover {
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .config-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .config-card-header h4 {
            font-size: 14px;
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .config-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .config-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: var(--card);
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        
        .config-item label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text);
        }
        
        .config-item small {
            display: block;
            font-size: 10px;
            color: var(--text-secondary);
            margin-top: 2px;
        }
        
        .toggle-switch {
            position: relative;
            width: 44px;
            height: 24px;
            flex-shrink: 0;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #CBD5E0;
            transition: 0.3s;
            border-radius: 24px;
        }
        
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background: white;
            transition: 0.3s;
            border-radius: 50%;
        }
        
        .toggle-switch input:checked + .toggle-slider {
            background: var(--success, #10B981);
        }
        
        .toggle-switch input:checked + .toggle-slider:before {
            transform: translateX(20px);
        }
        
        .info-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
        }
        
        .info-badge.success { background: #D1FAE5; color: #065F46; }
        .info-badge.warning { background: #FEF3C7; color: #92400E; }
        .info-badge.info { background: #DBEAFE; color: #1E40AF; }
        .info-badge.danger { background: #FEE2E2; color: #991B1B; }
        
        @media (max-width: 768px) {
            .config-grid { grid-template-columns: 1fr; }
            .config-tab { flex: 1; justify-content: center; font-size: 11px; padding: 8px 12px; }
        }
    </style>
    
    <div class="top-bar">
        <div>
            <h1>⚙️ Configurações</h1>
            <p style="font-size:11px;color:var(--text-secondary);">Gerencie as preferências do sistema</p>
        </div>
    </div>
    
    <div class="config-container">
        <!-- Abas -->
        <div class="config-tabs">
            <button class="config-tab active" onclick="switchConfigTab('conta', this)">
                <i class="fas fa-user-cog"></i> Conta
            </button>
            <button class="config-tab" onclick="switchConfigTab('notificacoes', this)">
                <i class="fas fa-bell"></i> Notificações
            </button>
            <button class="config-tab" onclick="switchConfigTab('sistema', this)">
                <i class="fas fa-cogs"></i> Sistema
            </button>
            <button class="config-tab" onclick="switchConfigTab('aparencia', this)">
                <i class="fas fa-palette"></i> Aparência
            </button>
            <button class="config-tab" onclick="switchConfigTab('backup', this)">
                <i class="fas fa-database"></i> Backup
            </button>
            <button class="config-tab" onclick="switchConfigTab('info', this)">
                <i class="fas fa-info-circle"></i> Info
            </button>
        </div>
        
        <!-- Painel: Conta -->
        <div class="config-panel active" id="panel-conta">
            <h3><i class="fas fa-user-cog"></i> Configurações da Conta</h3>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-key"></i> Alterar Senha</h4>
                </div>
                <form onsubmit="alterarSenha(event);return false;" style="display:grid;gap:10px;">
                    <div class="config-grid">
                        <div class="form-group">
                            <label>Senha Atual *</label>
                            <input type="password" id="senhaAtual" required placeholder="Digite sua senha atual">
                        </div>
                        <div></div>
                        <div class="form-group">
                            <label>Nova Senha *</label>
                            <input type="password" id="senhaNova" required minlength="6" placeholder="Mínimo 6 caracteres">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Nova Senha *</label>
                            <input type="password" id="senhaNovaConfirma" required minlength="6" placeholder="Repita a nova senha">
                        </div>
                    </div>
                    <div style="display:flex;justify-content:flex-end;">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Alterar Senha
                        </button>
                    </div>
                </form>
            </div>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-id-card"></i> Dados do Usuário</h4>
                </div>
                <div class="config-grid">
                    <div class="config-item">
                        <div>
                            <label>Nome</label>
                            <small>Identificação no sistema</small>
                        </div>
                        <strong>${sanitizar(usuarioLogado.nome)}</strong>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>Usuário</label>
                            <small>Nome de login</small>
                        </div>
                        <strong>@${sanitizar(usuarioLogado.usuario)}</strong>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>Cargo</label>
                            <small>Função no sistema</small>
                        </div>
                        <strong>${sanitizar(usuarioLogado.cargo)}</strong>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>Departamento</label>
                            <small>Área de atuação</small>
                        </div>
                        <span class="badge ${depto === 'TI' ? 'badge-blue' : 'badge-amber'}">${sanitizar(nomeDepto)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Painel: Notificações -->
        <div class="config-panel" id="panel-notificacoes">
            <h3><i class="fas fa-bell"></i> Preferências de Notificação</h3>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-mobile-alt"></i> Alertas do Sistema</h4>
                </div>
                <div style="display:grid;gap:8px;">
                    <div class="config-item">
                        <div>
                            <label>Novos Chamados</label>
                            <small>Notificar quando um novo chamado for aberto</small>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="cfgNotifChamado" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>SLA Atrasado</label>
                            <small>Alertar quando chamados estourarem o prazo</small>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="cfgNotifSLA" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>Conclusão de Chamado</label>
                            <small>Notificar quando um chamado for concluído</small>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="cfgNotifConclusao" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>Som de Notificação</label>
                            <small>Tocar som ao receber alertas</small>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="cfgSomNotif" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="config-item">
                        <div>
                            <label>WhatsApp Automático</label>
                            <small>Enviar mensagem WhatsApp ao atualizar status</small>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="cfgWhatsAppAuto">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                    <button class="btn btn-primary btn-sm" onclick="salvarConfigNotificacoes()">
                        <i class="fas fa-save"></i> Salvar Preferências
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Painel: Sistema -->
        <div class="config-panel" id="panel-sistema">
            <h3><i class="fas fa-cogs"></i> Configurações do Sistema</h3>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-clock"></i> Prazos SLA (minutos)</h4>
                    <span class="info-badge info">Ajuste os prazos</span>
                </div>
                <div class="config-grid">
                    <div class="form-group">
                        <label>🔴 Crítico</label>
                        <input type="number" id="cfgSLACritico" value="60" min="15">
                        <small style="color:var(--text-secondary);">Tempo máximo para chamados críticos</small>
                    </div>
                    <div class="form-group">
                        <label>🟠 Alta</label>
                        <input type="number" id="cfgSLAAlta" value="240" min="30">
                        <small style="color:var(--text-secondary);">Tempo máximo para chamados de alta prioridade</small>
                    </div>
                    <div class="form-group">
                        <label>🟡 Média</label>
                        <input type="number" id="cfgSLAMedia" value="1440" min="60">
                        <small style="color:var(--text-secondary);">Tempo máximo para chamados médios</small>
                    </div>
                    <div class="form-group">
                        <label>🟢 Baixa</label>
                        <input type="number" id="cfgSLABaixa" value="2880" min="120">
                        <small style="color:var(--text-secondary);">Tempo máximo para chamados de baixa prioridade</small>
                    </div>
                </div>
                <div class="config-item" style="margin-top:10px;">
                    <div>
                        <label>Alerta de SLA Próximo</label>
                        <small>Avisar quando estiver perto do vencimento</small>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="cfgAlertaSLA" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                    <button class="btn btn-primary btn-sm" onclick="salvarConfigSLA()">
                        <i class="fas fa-save"></i> Salvar Prazos
                    </button>
                </div>
            </div>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-building"></i> Setores (${setores.length})</h4>
                    <button class="btn btn-primary btn-sm" onclick="adicionarSetor()">
                        <i class="fas fa-plus"></i> Novo
                    </button>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <input type="text" id="novoSetor" placeholder="Nome do novo setor..." style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;">
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${setores.map((s, i) => `
                        <div style="display:flex;align-items:center;gap:6px;background:var(--bg);padding:6px 12px;border-radius:20px;border:1px solid var(--border);font-size:12px;">
                            <span>📍 ${sanitizar(s)}</span>
                            <button onclick="removerSetor(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0 2px;" title="Remover">&times;</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-sitemap"></i> Departamentos (${departamentosChamados.length})</h4>
                    <button class="btn btn-primary btn-sm" onclick="adicionarDepto()">
                        <i class="fas fa-plus"></i> Novo
                    </button>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <input type="text" id="novoDepto" placeholder="Nome do departamento..." style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;">
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${departamentosChamados.map((d, i) => `
                        <div style="display:flex;align-items:center;gap:6px;background:var(--bg);padding:6px 12px;border-radius:20px;border:1px solid var(--border);font-size:12px;">
                            <span>📋 ${sanitizar(d)}</span>
                            <button onclick="removerDepto(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0 2px;" title="Remover">&times;</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <!-- Painel: Aparência -->
        <div class="config-panel" id="panel-aparencia">
            <h3><i class="fas fa-palette"></i> Aparência e Temas</h3>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-images"></i> Logos para Relatórios</h4>
                </div>
                <div class="config-grid">
                    <div class="form-group">
                        <label>Logo do Hospital</label>
                        ${logoHospital ? `<img src="${logoHospital}" style="max-height:50px;display:block;margin:8px 0;border-radius:8px;">` : '<p style="color:var(--text-secondary);font-size:11px;">Nenhuma logo cadastrada</p>'}
                        <input type="file" id="logoHospitalFile" accept="image/*" style="padding:6px;">
                    </div>
                    <div class="form-group">
                        <label>Logo do Governo/Secretaria</label>
                        ${logoGoverno ? `<img src="${logoGoverno}" style="max-height:50px;display:block;margin:8px 0;border-radius:8px;">` : '<p style="color:var(--text-secondary);font-size:11px;">Nenhuma logo cadastrada</p>'}
                        <input type="file" id="logoGovernoFile" accept="image/*" style="padding:6px;">
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                    <button class="btn btn-primary btn-sm" onclick="salvarLogos()">
                        <i class="fas fa-save"></i> Salvar Logos
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Painel: Backup -->
        <div class="config-panel" id="panel-backup">
            <h3><i class="fas fa-database"></i> Backup e Manutenção</h3>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-download"></i> Exportar Dados</h4>
                    <span class="info-badge success">Recomendado</span>
                </div>
                <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">
                    Faça backup completo de todos os dados do sistema (chamados, inventário, estoque, IPs, usuários e configurações).
                    As senhas não são incluídas por segurança.
                </p>
                <button class="btn btn-primary" onclick="exportarBackup()">
                    <i class="fas fa-download"></i> Exportar Backup Completo
                </button>
            </div>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-upload"></i> Restaurar Dados</h4>
                    <span class="info-badge warning">Cuidado</span>
                </div>
                <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">
                    Importe um arquivo de backup para restaurar os dados. Esta ação irá sobrescrever os dados atuais.
                </p>
                <button class="btn btn-outline" onclick="importarBackup()">
                    <i class="fas fa-upload"></i> Importar Backup
                </button>
            </div>
            
            <div class="config-card" style="border-color:#FED7D7;">
                <div class="config-card-header">
                    <h4 style="color:#E53E3E;"><i class="fas fa-broom"></i> Limpeza de Dados</h4>
                    <span class="info-badge danger">Irreversível</span>
                </div>
                <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">
                    Remova chamados antigos para liberar espaço. Recomendado manter pelo menos 1 ano de histórico.
                </p>
                <button class="btn btn-danger" onclick="limparDadosAntigos()">
                    <i class="fas fa-broom"></i> Limpar Chamados Antigos
                </button>
            </div>
        </div>
        
        <!-- Painel: Informações -->
        <div class="config-panel" id="panel-info">
            <h3><i class="fas fa-info-circle"></i> Informações do Sistema</h3>
            
            <div class="config-card">
                <div class="config-card-header">
                    <h4><i class="fas fa-server"></i> Dados do Sistema</h4>
                </div>
                <div class="config-grid">
                    <div class="config-item">
                        <div><label>Versão</label></div>
                        <span class="info-badge info">v2.0.0</span>
                    </div>
                    <div class="config-item">
                        <div><label>Banco de Dados</label></div>
                        <span class="info-badge success">Firestore</span>
                    </div>
                    <div class="config-item">
                        <div><label>Arquivos</label></div>
                        <span class="info-badge success">Firebase Storage</span>
                    </div>
                    <div class="config-item">
                        <div><label>Hospedagem</label></div>
                        <span class="info-badge info">Firebase</span>
                    </div>
                    <div class="config-item">
                        <div><label>Setores Cadastrados</label></div>
                        <strong>${setores.length}</strong>
                    </div>
                    <div class="config-item">
                        <div><label>Departamentos</label></div>
                        <strong>${departamentosChamados.length}</strong>
                    </div>
                    <div class="config-item">
                        <div><label>Total de Chamados</label></div>
                        <strong>${chamados.length}</strong>
                    </div>
                    <div class="config-item">
                        <div><label>Setores no Inventário</label></div>
                        <strong>${inventario.length}</strong>
                    </div>
                    <div class="config-item">
                        <div><label>Itens em Estoque</label></div>
                        <strong>${estoque.length}</strong>
                    </div>
                    <div class="config-item">
                        <div><label>Usuário Atual</label></div>
                        <strong>${sanitizar(usuarioLogado.nome)}</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================
// TROCA DE ABAS
// ============================================
function switchConfigTab(tabName, btn) {
    // Atualizar botões
    document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    // Atualizar painéis
    document.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + tabName);
    if (panel) panel.classList.add('active');
}

// ============================================
// FUNÇÕES DE CONFIGURAÇÃO (MANTIDAS)
// ============================================

async function salvarLogos() {
    const hf = document.getElementById('logoHospitalFile')?.files[0];
    const gf = document.getElementById('logoGovernoFile')?.files[0];
    const updates = {};
    
    try {
        if (hf) {
            toast('📤 Enviando logo do hospital...', 'info');
            const ref = storage.ref('logos/hospital_' + Date.now());
            await ref.put(hf);
            updates.hospital = await ref.getDownloadURL();
        }
        if (gf) {
            toast('📤 Enviando logo do governo...', 'info');
            const ref = storage.ref('logos/governo_' + Date.now());
            await ref.put(gf);
            updates.governo = await ref.getDownloadURL();
        }
        if (Object.keys(updates).length > 0) {
            await db.collection('configuracoes').doc('logos').set(updates, { merge: true });
            if (updates.hospital) logoHospital = updates.hospital;
            if (updates.governo) logoGoverno = updates.governo;
            toast('✅ Logos atualizados!', 'success');
            renderConfig();
        }
    } catch (e) { toast('Erro ao salvar logos', 'error'); }
}

async function adicionarSetor() {
    const i = document.getElementById('novoSetor');
    const n = i?.value.trim();
    if (!n) { toast('Digite um nome', 'error'); return; }
    if (setores.includes(n)) { toast('Setor já existe', 'error'); return; }
    setores.push(n);
    setores.sort();
    try {
        await db.collection('configuracoes').doc('setores').set({ setores });
        i.value = '';
        renderConfig();
        toast('✅ Setor adicionado!', 'success');
    } catch (e) { toast('Erro ao salvar', 'error'); }
}

async function removerSetor(i) {
    if (!confirm(`Remover "${setores[i]}"?`)) return;
    setores.splice(i, 1);
    try {
        await db.collection('configuracoes').doc('setores').set({ setores });
        renderConfig();
        toast('🗑️ Removido!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

async function adicionarDepto() {
    const i = document.getElementById('novoDepto');
    const n = i?.value.trim().toUpperCase();
    if (!n) { toast('Digite um nome', 'error'); return; }
    if (departamentosChamados.includes(n)) { toast('Já existe', 'error'); return; }
    departamentosChamados.push(n);
    try {
        await db.collection('configuracoes').doc('departamentos_chamados').set({ departamentos: departamentosChamados });
        i.value = '';
        renderConfig();
        toast('✅ Adicionado!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

async function removerDepto(i) {
    if (!confirm(`Remover "${departamentosChamados[i]}"?`)) return;
    departamentosChamados.splice(i, 1);
    try {
        await db.collection('configuracoes').doc('departamentos_chamados').set({ departamentos: departamentosChamados });
        renderConfig();
        toast('🗑️ Removido!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

async function alterarSenha(e) {
    e.preventDefault();
    const sa = document.getElementById('senhaAtual')?.value;
    const sn = document.getElementById('senhaNova')?.value;
    const sc = document.getElementById('senhaNovaConfirma')?.value;
    
    if (!sa || !sn || !sc) { toast('Preencha todos os campos', 'error'); return; }
    if (sn !== sc) { toast('Senhas não conferem', 'error'); return; }
    if (sn.length < 6) { toast('Mínimo 6 caracteres', 'error'); return; }
    
    try {
        const us = await db.collection('usuarios').where('usuario', '==', usuarioLogado.usuario).get();
        if (us.empty) { toast('Usuário não encontrado', 'error'); return; }
        if (us.docs[0].data().senha !== sa) { toast('Senha atual incorreta', 'error'); return; }
        await us.docs[0].ref.update({ senha: sn, primeiro_acesso: false });
        toast('✅ Senha alterada!', 'success');
        e.target.reset();
    } catch (e) { toast('Erro', 'error'); }
}

async function salvarConfigNotificacoes() {
    const config = {
        notificarNovoChamado: document.getElementById('cfgNotifChamado')?.checked || false,
        notificarSLA: document.getElementById('cfgNotifSLA')?.checked || false,
        notificarConclusao: document.getElementById('cfgNotifConclusao')?.checked || false,
        somNotificacao: document.getElementById('cfgSomNotif')?.checked || false,
        whatsappAuto: document.getElementById('cfgWhatsAppAuto')?.checked || false
    };
    try {
        await db.collection('configuracoes').doc('notificacoes').set(config, { merge: true });
        toast('✅ Notificações salvas!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

async function salvarConfigSLA() {
    const config = {
        slaCritico: parseInt(document.getElementById('cfgSLACritico')?.value) || 60,
        slaAlta: parseInt(document.getElementById('cfgSLAAlta')?.value) || 240,
        slaMedia: parseInt(document.getElementById('cfgSLAMedia')?.value) || 1440,
        slaBaixa: parseInt(document.getElementById('cfgSLABaixa')?.value) || 2880,
        alertaSLA: document.getElementById('cfgAlertaSLA')?.checked || false
    };
    try {
        await db.collection('configuracoes').doc('sla').set(config, { merge: true });
        toast('✅ Prazos SLA salvos!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

async function exportarBackup() {
    try {
        toast('📦 Gerando backup...', 'info');
        const backup = { data: new Date().toISOString(), departamento: depto, exportadoPor: usuarioLogado.nome };
        const snapChamados = await db.collection('chamados').get();
        backup.chamados = []; snapChamados.forEach(d => backup.chamados.push({ id: d.id, ...d.data() }));
        const snapInv = await db.collection('inventario').get();
        backup.inventario = []; snapInv.forEach(d => backup.inventario.push({ id: d.id, ...d.data() }));
        const snapEstoque = await db.collection('estoque').get();
        backup.estoque = []; snapEstoque.forEach(d => backup.estoque.push({ id: d.id, ...d.data() }));
        const snapIPs = await db.collection('ips_rede').get();
        backup.ips = []; snapIPs.forEach(d => backup.ips.push({ id: d.id, ...d.data() }));
        const snapUsers = await db.collection('usuarios').get();
        backup.usuarios = []; snapUsers.forEach(d => { const u = d.data(); delete u.senha; backup.usuarios.push({ id: d.id, ...u }); });
        const snapConfig = await db.collection('configuracoes').get();
        backup.configuracoes = []; snapConfig.forEach(d => backup.configuracoes.push({ id: d.id, ...d.data() }));
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `backup-helphosp-${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        toast('✅ Backup exportado!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

function importarBackup() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!confirm('⚠️ Importar backup irá SOBRESCREVER dados atuais. Continuar?')) return;
        try {
            toast('📥 Importando...', 'info');
            const text = await file.text(); const backup = JSON.parse(text);
            if (backup.configuracoes) for (const c of backup.configuracoes) { const { id, ...d } = c; await db.collection('configuracoes').doc(id).set(d, { merge: true }); }
            if (backup.usuarios) for (const u of backup.usuarios) { const { id, ...d } = u; await db.collection('usuarios').doc(id).set(d, { merge: true }); }
            toast('✅ Importado! Recarregue a página.', 'success');
            setTimeout(() => location.reload(), 2000);
        } catch (e) { toast('Erro', 'error'); }
    };
    input.click();
}

async function limparDadosAntigos() {
    const dias = prompt('Remover chamados com mais de quantos dias?', '365');
    if (!dias) return;
    const d = parseInt(dias);
    if (isNaN(d) || d < 30) { toast('Mínimo 30 dias', 'error'); return; }
    if (!confirm(`⚠️ Remover chamados com mais de ${d} dias?`)) return;
    try {
        toast('🧹 Limpando...', 'info');
        const dl = new Date(); dl.setDate(dl.getDate() - d);
        const snap = await db.collection('chamados').where('data_abertura', '<', firebase.firestore.Timestamp.fromDate(dl)).get();
        const batch = db.batch(); let c = 0;
        snap.forEach(doc => { batch.delete(doc.ref); c++; });
        if (c > 0) { await batch.commit(); toast(`✅ ${c} chamados removidos!`, 'success'); }
        else { toast('📭 Nenhum encontrado', 'info'); }
    } catch (e) { toast('Erro', 'error'); }
}