// ============================================
// GERENCIAMENTO DE CHAMADOS
// ============================================

function renderChamados() {
    const main = document.getElementById('mainContent');
    const f = chamados.filter(c => c.tipo !== 'gesthosp');
    
    main.innerHTML = `
    <div class="top-bar">
        <h1>📋 Chamados — ${sanitizar(nomeDepto)} (${f.length})</h1>
        <button class="btn btn-primary btn-sm" onclick="abrirNovoChamadoAdmin()">
            <i class="fas fa-plus"></i> Novo Chamado
        </button>
    </div>
    <div class="filtros-bar">
        <select id="filtroStatus" onchange="filtrarChamadosUI()"><option value="">Todos</option><option>A Fazer</option><option>Em Andamento</option><option>Pendente</option><option>Concluído</option></select>
        <select id="filtroPrioridade" onchange="filtrarChamadosUI()"><option value="">Todas</option><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select>
        <input type="text" id="filtroBusca" placeholder="🔍 Buscar..." onkeyup="filtrarChamadosUI()">
    </div>
    <div class="table-card"><table>
        <thead><tr><th>Protocolo</th><th>Data</th><th>Título</th><th>Solicitante</th><th>Contato</th><th>Setor</th><th>Prioridade</th><th>Status</th><th>SLA</th><th>Ações</th></tr></thead>
        <tbody id="tabelaChamados">${renderLinhasChamados(f)}</tbody>
    </table></div>`;
}

function renderLinhasChamados(l) {
    if (l.length === 0) return '<tr><td colspan="10" style="text-align:center;padding:20px;">Nenhum chamado</td></tr>';
    return l.sort((a, b) => toDate(b.data_abertura) - toDate(a.data_abertura)).map(c => {
        let ac = `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();mudarStatusChamado('${c.fid}')">▶</button>`;
        if (depto === 'MANUTENCAO') ac += `<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();atribuirExecutante('${c.fid}')">👷</button>`;
        ac += `<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();abrirComentarios('${c.fid}')">💬</button>`;
        if (getPerms().isAdmin) ac += `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();excluirChamado('${c.fid}')">🗑️</button>`;
        
        let contato = sanitizar(c.contato || '—');
        if (c.contato && c.contato.replace(/\D/g, '').length >= 10) {
            const num = c.contato.replace(/\D/g, '');
            contato = `<a href="https://wa.me/55${num}" target="_blank" style="color:#25D366;text-decoration:none;"><i class="fab fa-whatsapp"></i> ${c.contato}</a>`;
        }
        return `<tr onclick="verDetalhes('${c.fid}')">
            <td><strong>${sanitizar(c.protocolo||'—')}</strong></td><td>${fmtDataCurta(c.data_abertura)}</td>
            <td>${sanitizar(c.titulo||'—')}</td><td>${sanitizar(c.solicitante||'—')}</td>
            <td>${contato}</td><td>${sanitizar(c.setor||'—')}</td>
            <td><span class="badge ${getPrioridadeClass(c.prioridade)}">${sanitizar(c.prioridade||'—')}</span></td>
            <td><span class="badge ${getStatusClass(c.status)}">${sanitizar(c.status||'—')}</span></td>
            <td><span class="sla-alert ${getSLAStatus(c)}">${getSLATexto(c)}</span></td>
            <td onclick="event.stopPropagation();">${ac}</td></tr>`;
    }).join('');
}

function filtrarChamadosUI() {
    const sf = document.getElementById('filtroStatus')?.value || '';
    const pf = document.getElementById('filtroPrioridade')?.value || '';
    const bf = (document.getElementById('filtroBusca')?.value || '').toLowerCase();
    let l = chamados.filter(c => c.tipo !== 'gesthosp');
    if (sf) l = l.filter(c => c.status === sf);
    if (pf) l = l.filter(c => c.prioridade === pf);
    if (bf) l = l.filter(c => (c.titulo||'').toLowerCase().includes(bf) || (c.protocolo||'').toLowerCase().includes(bf));
    const tb = document.getElementById('tabelaChamados');
    if (tb) tb.innerHTML = renderLinhasChamados(l);
}

// ============================================
// MUDAR STATUS (NOME DIFERENTE - SEM CONFLITO)
// ============================================
async function mudarStatusChamado(id) {
    console.log('▶️ Mudando status do chamado:', id);
    
    try {
        const docRef = db.collection('chamados').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            toast('Chamado não encontrado', 'error');
            return;
        }
        
        const dados = doc.data();
        const statusAtual = dados.status || 'A Fazer';
        
        const fluxo = {
            'A Fazer': 'Em Andamento',
            'Em Andamento': 'Pendente',
            'Pendente': 'Concluído',
            'Concluído': 'A Fazer'
        };
        
        const novoStatus = fluxo[statusAtual] || 'A Fazer';
        
        const atualizacao = {
            status: novoStatus,
            data_atualizacao: firebase.firestore.Timestamp.now()
        };
        
        if (novoStatus === 'Em Andamento' || novoStatus === 'Concluído') {
            atualizacao.tecnico = usuarioLogado.nome;
        }
        
        const timeline = dados.timeline || [];
        timeline.push({
            data: new Date().toISOString(),
            status: novoStatus,
            acao: `Status alterado para "${novoStatus}" por ${usuarioLogado.nome}`
        });
        atualizacao.timeline = timeline;
        
        await docRef.update(atualizacao);
        toast('✅ Status: ' + novoStatus, 'success');
        
    } catch (erro) {
        console.error('Erro:', erro);
        toast('Erro ao atualizar', 'error');
    }
}

// ============================================
// NOVO CHAMADO PELO ADMIN
// ============================================
function abrirNovoChamadoAdmin() {
    const categorias = depto === 'TI' ? 
        ['Computador não liga','Computador lento','Monitor com defeito','Teclado/Mouse quebrado','Impressora não funciona','Impressora sem toner','Sistema fora do ar','Sistema com erro','Rede fora do ar','Internet lenta','Wi-Fi não conecta','Senha bloqueada','Acesso ao sistema','Telefone com defeito','Instalação de software','Cabo de rede danificado','Outros - TI'] :
        ['Problema elétrico','Tomada quebrada','Lâmpada queimada','Disjuntor desarmando','Vazamento de água','Torneira pingando','Descarga com problema','Pia entupida','Ar-condicionado não gela','Ar-condicionado pingando','Pintura danificada','Parede com infiltração','Móvel quebrado','Porta com problema','Janela quebrada','Telhado com goteira','Piso danificado','Fechadura com defeito','Outros - Manutenção'];
    
    const setorOptions = setores.map(s => `<option value="${s}">${s}</option>`).join('');
    const catOptions = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    
    abrirModal(`
        <div class="modal-header"><h3>📝 Novo Chamado - ${sanitizar(nomeDepto)}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <form onsubmit="criarChamadoAdmin(event)" style="display:grid;gap:10px;">
            <div class="form-row"><div class="form-group"><label>Solicitante *</label><input type="text" id="admSolicitante" required></div><div class="form-group"><label>Contato</label><input type="text" id="admContato" placeholder="WhatsApp/Ramal"></div></div>
            <div class="form-row"><div class="form-group"><label>Setor *</label><select id="admSetor" required><option value="">Selecione...</option>${setorOptions}</select></div><div class="form-group"><label>Categoria *</label><select id="admCategoria" required><option value="">Selecione...</option>${catOptions}</select></div></div>
            <div class="form-row"><div class="form-group"><label>Prioridade *</label><select id="admPrioridade" required><option value="Baixa">🟢 Baixa</option><option value="Média" selected>🟡 Média</option><option value="Alta">🟠 Alta</option><option value="Crítica">🔴 Crítica</option></select></div><div class="form-group"><label>Técnico</label><input type="text" id="admTecnico" value="${usuarioLogado.nome}" readonly></div></div>
            <div class="form-group"><label>Título *</label><input type="text" id="admTitulo" required></div>
            <div class="form-group"><label>Descrição</label><textarea id="admDescricao" rows="3"></textarea></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;"><button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancelar</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Criar Chamado</button></div>
        </form>`, '650px');
}

async function criarChamadoAdmin(e) {
    e.preventDefault();
    const solicitante = document.getElementById('admSolicitante')?.value.trim();
    const setor = document.getElementById('admSetor')?.value;
    const categoria = document.getElementById('admCategoria')?.value;
    const prioridade = document.getElementById('admPrioridade')?.value;
    const titulo = document.getElementById('admTitulo')?.value.trim();
    const descricao = document.getElementById('admDescricao')?.value.trim();
    const contato = document.getElementById('admContato')?.value.trim();
    
    if (!solicitante || !setor || !categoria || !titulo) {
        toast('Preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    try {
        const protocolo = 'CH-' + Date.now().toString(36).toUpperCase().slice(-8);
        await db.collection('chamados').add({
            protocolo, departamento: depto, tipo: 'chamado', titulo, descricao,
            solicitante, contato, setor, categoria, prioridade,
            status: 'A Fazer', tecnico: usuarioLogado.nome,
            data_abertura: firebase.firestore.Timestamp.now(),
            timeline: [{ data: new Date().toISOString(), status: 'A Fazer', acao: `Aberto por ${usuarioLogado.nome}` }]
        });
        document.querySelector('.modal-overlay')?.remove();
        toast('✅ Chamado criado! Protocolo: ' + protocolo, 'success');
    } catch (erro) {
        toast('Erro ao criar chamado', 'error');
    }
}

// ============================================
// DEMAIS FUNÇÕES
// ============================================
async function atribuirExecutante(id) {
    try {
        const snap = await db.collection('usuarios').where('departamento','==','MANUTENCAO').where('status','==','ativo').get();
        const t = []; snap.forEach(d => t.push(d.data()));
        abrirModal(`<div class="modal-header"><h3>👷 Atribuir Executante</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
            <form onsubmit="salvarExecutante(event,'${id}')" style="display:grid;gap:8px;">
                <div class="form-group"><label>Profissional *</label><select id="execSel" required><option value="">Selecione...</option>${t.map(x=>`<option value="${x.nome}">${x.nome} - ${x.cargo}</option>`).join('')}</select></div>
                <div style="display:flex;gap:6px;"><button type="submit" class="btn btn-primary">Salvar</button></div></form>`);
    } catch (e) { toast('Erro', 'error'); }
}

async function salvarExecutante(e, id) {
    e.preventDefault();
    const exec = document.getElementById('execSel')?.value;
    if (!exec) { toast('Selecione', 'error'); return; }
    try { await db.collection('chamados').doc(id).update({ executante: exec }); document.querySelector('.modal-overlay')?.remove(); toast('✅ Definido!', 'success'); }
    catch (e) { toast('Erro', 'error'); }
}

async function excluirChamado(id) {
    if (!confirm('Excluir?')) return;
    try { await db.collection('chamados').doc(id).delete(); toast('🗑️ Excluído!', 'success'); }
    catch (e) { toast('Erro', 'error'); }
}

function verDetalhes(id) {
    const c = chamados.find(x => x.fid === id);
    if (!c) return;
    if (c.tipo === 'gesthosp') { verDetalhesGestHosp(c); return; }
    
    let contatoInfo = sanitizar(c.contato || '—');
    if (c.contato && c.contato.replace(/\D/g,'').length >= 10) {
        const num = c.contato.replace(/\D/g,'');
        contatoInfo = `<a href="https://wa.me/55${num}" target="_blank" style="color:#25D366;"><i class="fab fa-whatsapp"></i> ${c.contato}</a>`;
    }
    
    const cont = `
    <div style="background:linear-gradient(135deg,var(--primary),#1a3a5c);color:white;padding:20px;border-radius:12px;margin-bottom:16px;"><h3>${sanitizar(c.titulo||'Sem título')}</h3><p style="margin-top:8px;">📋 Protocolo: ${sanitizar(c.protocolo||'—')}</p><p>📅 Aberto em: ${fmtData(c.data_abertura)}</p></div>
    <div style="background:#F0FDF4;padding:16px;border-radius:10px;border:2px solid #86EFAC;margin-bottom:14px;"><h4 style="color:#166534;">👤 Solicitante</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div style="background:white;padding:10px;border-radius:6px;"><strong>Nome:</strong> ${sanitizar(c.solicitante||'—')}</div><div style="background:white;padding:10px;border-radius:6px;"><strong>📱 Contato:</strong> ${contatoInfo}</div><div style="background:white;padding:10px;border-radius:6px;"><strong>📍 Setor:</strong> ${sanitizar(c.setor||'—')}</div><div style="background:white;padding:10px;border-radius:6px;"><strong>🏢 Depto:</strong> ${sanitizar((c.departamento||'TI')==='TI'?'🖥️ TI':'🔧 Manutenção')}</div></div></div>
    <div style="background:#EFF6FF;padding:16px;border-radius:10px;border:2px solid #93C5FD;margin-bottom:14px;"><h4 style="color:#1E40AF;">📋 Chamado</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div style="background:white;padding:10px;border-radius:6px;"><strong>⚡ Prioridade:</strong> ${sanitizar(c.prioridade||'—')}</div><div style="background:white;padding:10px;border-radius:6px;"><strong>📊 Status:</strong> ${sanitizar(c.status||'—')}</div><div style="background:white;padding:10px;border-radius:6px;"><strong>📋 Categoria:</strong> ${sanitizar(c.categoria||'—')}</div><div style="background:white;padding:10px;border-radius:6px;"><strong>🔧 Técnico:</strong> ${sanitizar(c.tecnico||'Não atribuído')}</div>${c.executante?`<div style="background:white;padding:10px;border-radius:6px;"><strong>👷 Executante:</strong> ${sanitizar(c.executante)}</div>`:''}<div style="background:white;padding:10px;border-radius:6px;"><strong>⏱️ SLA:</strong> <span class="sla-alert ${getSLAStatus(c)}">${getSLATexto(c)}</span></div></div></div>
    ${c.descricao?`<div style="background:#FFFBEB;padding:16px;border-radius:10px;border:2px solid #FDE68A;margin-bottom:14px;"><h4 style="color:#92400E;">📝 Descrição</h4><p>${sanitizar(c.descricao)}</p></div>`:''}
    <div style="display:flex;gap:6px;justify-content:flex-end;"><button class="btn btn-primary btn-sm" onclick="mudarStatusChamado('${c.fid}');this.closest('.modal-overlay').remove();">▶ Avançar</button>${depto==='MANUTENCAO'?`<button class="btn btn-outline btn-sm" onclick="atribuirExecutante('${c.fid}');this.closest('.modal-overlay').remove();">👷</button>`:''}<button class="btn btn-outline btn-sm" onclick="abrirComentarios('${c.fid}');this.closest('.modal-overlay').remove();">💬</button>${getPerms().isAdmin?`<button class="btn btn-danger btn-sm" onclick="excluirChamado('${c.fid}');this.closest('.modal-overlay').remove();">🗑️</button>`:''}</div>`;
    
    abrirModal(`<div class="modal-header"><h3>📋 Detalhes</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>${cont}`, '750px');
}

function verDetalhesGestHosp(c) {
    let d = {};
    try { if (c.descricao) d = typeof c.descricao === 'string' ? JSON.parse(c.descricao) : c.descricao; } catch (e) {}
    const cont = `
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:12px;margin-bottom:16px;"><h3>🏥 GestHosp</h3><p>Protocolo: ${sanitizar(c.protocolo||'—')} | Status: ${sanitizar(c.status||'—')}</p></div>
    <div style="background:#FEF3C7;padding:20px;border-radius:12px;border:2px solid #F59E0B;margin-bottom:16px;"><h4 style="color:#92400E;">👤 Dados Pessoais</h4><div style="display:grid;gap:8px;">${['nome','cpf','rg','dataNascimento','email','telefone'].map(k=>`<div><label>${k.toUpperCase()}</label><p>${sanitizar(d[k]||'—')}</p></div>`).join('')}</div></div>
    <div style="background:#DBEAFE;padding:20px;border-radius:12px;border:2px solid #93C5FD;margin-bottom:16px;"><h4 style="color:#1E40AF;">📍 Endereço</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${['cep','logradouro','numero','complemento','bairro','cidade','estado'].map(k=>`<div><label>${k.toUpperCase()}</label><p>${sanitizar(d[k]||'—')}</p></div>`).join('')}</div></div>
    <div style="background:#D1FAE5;padding:20px;border-radius:12px;border:2px solid #6EE7B7;margin-bottom:16px;"><h4 style="color:#065F46;">🏥 Profissionais</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${['profissao','numConselho'].map(k=>`<div><label>${k.toUpperCase()}</label><p>${sanitizar(d[k]||'—')}</p></div>`).join('')}</div></div>
    <div style="display:flex;gap:6px;justify-content:flex-end;"><button class="btn btn-primary btn-sm" onclick="mudarStatusChamado('${c.fid}');this.closest('.modal-overlay').remove();">▶</button>${getPerms().isAdmin?`<button class="btn btn-danger btn-sm" onclick="excluirChamado('${c.fid}');this.closest('.modal-overlay').remove();">🗑️</button>`:''}</div>`;
    abrirModal(`<div class="modal-header"><h3>📋 Detalhes GestHosp</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>${cont}`, '750px');
}

function abrirComentarios(id) {
    comentarioChamadoId = id;
    const c = chamados.find(x => x.fid === id);
    if (!c) return;
    const cs = (c.comentarios||[]).map(co=>`<div style="background:#F7FAFC;padding:8px;border-radius:6px;margin-bottom:4px;"><strong>${sanitizar(co.autor)}</strong><p>${sanitizar(co.texto)}</p></div>`).join('');
    abrirModal(`<div class="modal-header"><h3>💬 Comentários</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div><p>${sanitizar(c.protocolo||'')}</p><div style="max-height:200px;overflow-y:auto;margin:10px 0;">${cs||'<p>Nenhum</p>'}</div><div style="display:flex;gap:6px;"><textarea id="textoComentario" placeholder="Digite..." style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;resize:none;height:38px;"></textarea><button class="btn btn-primary btn-sm" onclick="salvarComentario()">Enviar</button></div>`);
}

async function salvarComentario() {
    const t = document.getElementById('textoComentario')?.value.trim();
    if (!t) return;
    try {
        const d = await db.collection('chamados').doc(comentarioChamadoId).get();
        const cs = d.data().comentarios || [];
        cs.push({ autor: `${usuarioLogado.nome} (${nomeDepto})`, data: new Date().toISOString(), texto: t });
        await d.ref.update({ comentarios: cs });
        document.querySelector('.modal-overlay')?.remove();
        toast('✅ Adicionado!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}
