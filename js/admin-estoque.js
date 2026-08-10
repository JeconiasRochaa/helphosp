// ============================================
// CONTROLE DE ESTOQUE - INTERFACE RENOVADA
// ============================================

function renderEstoque() {
    const main = document.getElementById('mainContent');
    
    main.innerHTML = `
    <style>
        .estoque-container { max-width: 1100px; margin: 0 auto; }
        .estoque-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 16px; }
        
        .estoque-card {
            background: var(--card); border: 1px solid var(--border); border-radius: 16px;
            padding: 20px; text-align: center; transition: all 0.3s; cursor: pointer; position: relative;
        }
        .estoque-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); border-color: var(--primary); }
        .estoque-card .emoji { font-size: 48px; display: block; margin-bottom: 10px; }
        .estoque-card h4 { font-size: 14px; color: var(--primary); margin: 8px 0; }
        .estoque-card .qtd { font-size: 28px; font-weight: 700; color: var(--primary); margin: 6px 0; }
        .estoque-card .status-badge { display: inline-block; padding: 4px 12px; border-radius: 15px; font-size: 10px; font-weight: 600; margin: 4px 0; }
        .estoque-card .status-badge.em-estoque { background: #D1FAE5; color: #065F46; }
        .estoque-card .status-badge.com-defeito { background: #FEE2E2; color: #991B1B; }
        .estoque-card .status-badge.em-manutencao { background: #FEF3C7; color: #92400E; }
        .estoque-card .card-actions {
            position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.3s;
        }
        .estoque-card:hover .card-actions { opacity: 1; }
        .estoque-empty { text-align: center; padding: 60px; grid-column: 1/-1; }
        .estoque-empty i { font-size: 60px; color: var(--text-secondary); opacity: 0.3; display: block; margin-bottom: 15px; }
    </style>
    
    <div class="top-bar">
        <div><h1>📦 Estoque</h1><p style="font-size:11px;color:var(--text-secondary);">Controle de equipamentos e suprimentos</p></div>
        <button class="btn btn-primary btn-sm" onclick="abrirModalEstoqueItem()"><i class="fas fa-plus"></i> Novo Item</button>
    </div>
    
    <div class="estoque-container">
        <div id="estoqueContent"><div style="text-align:center;padding:40px;"><div class="spinner" style="margin:0 auto;"></div></div></div>
    </div>`;
    
    carregarEstoque();
}

async function carregarEstoque() {
    const snap = await db.collection('estoque').get();
    estoque = []; snap.forEach(d => { const x = d.data(); x.fid = d.id; estoque.push(x); });
    
    const container = document.getElementById('estoqueContent');
    if (!container) return;
    
    const totalItens = estoque.reduce((s, e) => s + (parseInt(e.quantidade) || 0), 0);
    const emEstoque = estoque.filter(e => e.status === 'Em estoque' || !e.status).length;
    const comDefeito = estoque.filter(e => e.status === 'Com defeito').length;
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-boxes"></i></div><div class="stat-info"><small>Total Itens</small><strong>${totalItens}</strong></div></div>
            <div class="stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-info"><small>Em Estoque</small><strong>${emEstoque}</strong></div></div>
            <div class="stat-card"><div class="stat-icon red"><i class="fas fa-exclamation-circle"></i></div><div class="stat-info"><small>Com Defeito</small><strong>${comDefeito}</strong></div></div>
            <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-cubes"></i></div><div class="stat-info"><small>Tipos</small><strong>${estoque.length}</strong></div></div>
        </div>
        
        <div class="estoque-grid">
            ${estoque.length === 0 ? `<div class="estoque-empty"><i class="fas fa-box-open"></i><h3>Estoque Vazio</h3><p>Clique em "Novo Item" para começar</p></div>` : 
            estoque.map(e => {
                const statusClass = (e.status === 'Com defeito' ? 'com-defeito' : e.status === 'Em manutenção' ? 'em-manutencao' : 'em-estoque');
                const statusNome = e.status || 'Em estoque';
                return `
                <div class="estoque-card" onclick="verDetalhesEstoque('${e.fid}')">
                    <div class="card-actions" onclick="event.stopPropagation();">
                        <button class="btn btn-sm btn-outline" onclick="editarEstoqueItem('${e.fid}')" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="excluirEstoqueItem('${e.fid}')" title="Excluir">🗑️</button>
                    </div>
                    <span class="emoji">${sanitizar(e.emoji || '📦')}</span>
                    <h4>${sanitizar(e.nome)}</h4>
                    <span class="status-badge ${statusClass}">${statusNome}</span>
                    <div class="qtd">${e.quantidade || 0} un.</div>
                    <button class="btn btn-sm btn-success" style="margin-top:8px;width:100%;" onclick="event.stopPropagation();moverParaSetor('${e.fid}')">
                        <i class="fas fa-arrow-right"></i> Mover p/ Setor
                    </button>
                </div>`;
            }).join('')}
        </div>`;
    
    window._estoqueData = estoque;
}

function verDetalhesEstoque(eid) {
    const item = estoque.find(e => e.fid === eid);
    if (!item) return;
    
    const statusClass = (item.status === 'Com defeito' ? 'com-defeito' : item.status === 'Em manutenção' ? 'em-manutencao' : 'em-estoque');
    
    abrirModal(`
        <div class="modal-header"><h3>${sanitizar(item.emoji||'📦')} ${sanitizar(item.nome)}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <div style="display:grid;gap:10px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="status-badge ${statusClass}" style="display:inline-block;padding:6px 14px;border-radius:15px;">${item.status||'Em estoque'}</span>
                <span style="font-size:24px;font-weight:700;">Qtd: ${item.quantidade||0}</span>
            </div>
            ${item.observacao ? `<div style="background:var(--bg);padding:12px;border-radius:8px;"><strong>📝 Observação:</strong> ${sanitizar(item.observacao)}</div>` : ''}
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button class="btn btn-success btn-sm" onclick="moverParaSetor('${item.fid}');this.closest('.modal-overlay').remove();"><i class="fas fa-arrow-right"></i> Mover</button>
                <button class="btn btn-outline btn-sm" onclick="editarEstoqueItem('${item.fid}');this.closest('.modal-overlay').remove();">✏️ Editar</button>
            </div>
        </div>
    `, '500px');
}

function moverParaSetor(eid) {
    const item = estoque.find(e => e.fid === eid);
    if (!item) return;
    
    abrirModal(`
        <div class="modal-header"><h3>📤 Mover para Setor</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <p style="background:#F7FAFC;padding:12px;border-radius:8px;margin-bottom:14px;"><strong>${sanitizar(item.emoji||'📦')} ${sanitizar(item.nome)}</strong> — Disponível: ${item.quantidade||1}</p>
        <form onsubmit="confirmarMoverSetor(event,'${eid}')" style="display:grid;gap:10px;">
            <div class="form-group"><label>Setor Destino *</label><select id="moverSetor" required><option value="">Selecione...</option>${setores.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Quantidade *</label><input type="number" id="moverQtd" value="1" min="1" max="${item.quantidade||1}" required></div>
                <div class="form-group"><label>Motivo *</label><select id="moverMotivo" required><option value="">Selecione...</option><option>Novo equipamento</option><option>Substituição</option><option>Reposição</option><option>Expansão</option><option>Emergência</option></select></div>
            </div>
            <div class="form-group"><label>Tipo de Equipamento</label><select id="moverTipoEquip"><option value="computadores">💻 Computador</option><option value="impressoras">🖨️ Impressora</option><option value="ramais">📞 Ramal</option><option value="tvs">📺 TV</option><option value="redes">📡 Rede</option><option value="outros">📱 Outros</option></select></div>
            <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Confirmar</button>
        </form>`);
}

async function confirmarMoverSetor(e, eid) {
    e.preventDefault();
    const setor = document.getElementById('moverSetor')?.value;
    const qtd = parseInt(document.getElementById('moverQtd')?.value) || 1;
    const motivo = document.getElementById('moverMotivo')?.value;
    const tipoEquip = document.getElementById('moverTipoEquip')?.value || 'outros';
    const item = estoque.find(x => x.fid === eid);
    if (!item || !setor || !motivo) return;
    if (qtd > (item.quantidade||1)) { toast('Quantidade indisponível', 'error'); return; }
    try {
        const rest = (item.quantidade||1) - qtd;
        if (rest <= 0) await db.collection('estoque').doc(eid).delete();
        else await db.collection('estoque').doc(eid).update({ quantidade: rest });
        const is = await db.collection('inventario').where('setor','==',setor).get();
        if (is.empty) { const n = { setor, computadores:0, impressoras:0, ramais:0, tvs:0, redes:0, outros:0 }; n[tipoEquip]=qtd; await db.collection('inventario').add(n); }
        else { const d=is.docs[0]; const da=d.data(); da[tipoEquip]=(da[tipoEquip]||0)+qtd; await d.ref.update({[tipoEquip]:da[tipoEquip]}); }
        await db.collection('movimentacoes').add({ data:firebase.firestore.Timestamp.now(), quantidade:qtd, tipo:tipoEquip, itemNome:item.nome, setorDestino:setor, motivo, tecnico:usuarioLogado.nome, departamento:depto });
        document.querySelector('.modal-overlay')?.remove();
        toast(`✅ ${qtd} un. movida para ${setor}!`, 'success');
        carregarEstoque();
    } catch (e) { toast('Erro', 'error'); }
}

function abrirModalEstoqueItem(id = null) {
    const item = id ? estoque.find(e => e.fid === id) : null;
    abrirModal(`
        <div class="modal-header"><h3>${id?'✏️ Editar':'📦 Novo Item'}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <form onsubmit="salvarEstoqueItem(event,'${id||''}')" style="display:grid;gap:10px;">
            <div class="form-group"><label>Emoji</label><input type="text" id="estoqueEmoji" maxlength="2" value="${item?.emoji||'📦'}"></div>
            <div class="form-group"><label>Nome *</label><input type="text" id="estoqueNome" required value="${sanitizar(item?.nome||'')}" placeholder="Nome do equipamento"></div>
            <div class="form-row">
                <div class="form-group"><label>Status</label><select id="estoqueStatus"><option value="Em estoque" ${item?.status==='Em estoque'?'selected':''}>🟢 Em estoque</option><option value="Com defeito" ${item?.status==='Com defeito'?'selected':''}>🔴 Com defeito</option><option value="Em manutenção" ${item?.status==='Em manutenção'?'selected':''}>🟡 Em manutenção</option></select></div>
                <div class="form-group"><label>Quantidade *</label><input type="number" id="estoqueQtd" value="${item?.quantidade||1}" min="1"></div>
            </div>
            <div class="form-group"><label>Observação</label><textarea id="estoqueObs" rows="2">${item?.observacao||''}</textarea></div>
            <button type="submit" class="btn btn-primary">💾 Salvar</button>
        </form>`);
}

async function salvarEstoqueItem(e, id) {
    e.preventDefault();
    const d = { emoji: document.getElementById('estoqueEmoji')?.value||'📦', nome: document.getElementById('estoqueNome')?.value.trim(), status: document.getElementById('estoqueStatus')?.value||'Em estoque', quantidade: parseInt(document.getElementById('estoqueQtd')?.value)||1, observacao: document.getElementById('estoqueObs')?.value.trim()||'' };
    if (!d.nome) return;
    try {
        if (id) await db.collection('estoque').doc(id).update(d);
        else { d.data_cadastro = firebase.firestore.Timestamp.now(); await db.collection('estoque').add(d); }
        document.querySelector('.modal-overlay')?.remove();
        carregarEstoque();
        toast('✅ Salvo!', 'success');
    } catch (e) { toast('Erro', 'error'); }
}

function editarEstoqueItem(id) { abrirModalEstoqueItem(id); }

async function excluirEstoqueItem(id) {
    if (!confirm('Excluir este item?')) return;
    try { await db.collection('estoque').doc(id).delete(); carregarEstoque(); toast('🗑️ Excluído!', 'success'); }
    catch (e) { toast('Erro', 'error'); }
}