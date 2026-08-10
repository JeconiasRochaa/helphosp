// ============================================
// EQUIPE - INTERFACE RENOVADA
// ============================================

function renderEquipe() {
    const main = document.getElementById('mainContent');
    const p = getPerms();
    
    if (!p.podeEquipe) {
        main.innerHTML = `<div class="top-bar"><h1>👥 Equipe</h1></div><div style="text-align:center;padding:60px;"><div style="font-size:60px;">🔒</div><h3>Acesso Restrito</h3></div>`;
        return;
    }
    
    main.innerHTML = `
    <style>
        .equipe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-top: 16px; }
        .membro-card {
            background: var(--card); border: 1px solid var(--border); border-radius: 16px;
            padding: 20px; text-align: center; transition: all 0.3s; position: relative;
        }
        .membro-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
        .membro-avatar {
            width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 24px; font-weight: 700; color: white;
            background: linear-gradient(135deg, var(--primary), #1a3a5c);
        }
        .membro-card h4 { font-size: 14px; color: var(--primary); }
        .membro-card small { font-size: 11px; color: var(--text-secondary); display: block; }
        .membro-card .badge { margin: 6px 0; }
        .membro-actions { display: flex; gap: 6px; justify-content: center; margin-top: 12px; }
    </style>
    <div class="top-bar"><div><h1>👥 Equipe</h1><p style="font-size:11px;color:var(--text-secondary);">${sanitizar(nomeDepto)}</p></div><button class="btn btn-primary btn-sm" onclick="abrirModalTecnico()"><i class="fas fa-plus"></i> Novo Membro</button></div>
    <div id="equipeContent"><div style="text-align:center;padding:40px;"><div class="spinner"></div></div></div>`;
    
    carregarEquipe();
}

async function carregarEquipe() {
    const snap = await db.collection('usuarios').where('departamento','==',depto).get();
    const membros = []; snap.forEach(d => { const u = d.data(); u.fid = d.id; membros.push(u); });
    
    const container = document.getElementById('equipeContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="equipe-grid">
            ${membros.length === 0 ? '<div style="text-align:center;padding:40px;grid-column:1/-1;">Nenhum membro</div>' :
            membros.map(m => `
            <div class="membro-card">
                <div class="membro-avatar" style="background:${m.usuario===usuarioLogado.usuario?'linear-gradient(135deg,#c8a94a,#b8861e)':'linear-gradient(135deg,var(--primary),#1a3a5c)'}">${(m.nome||'?').charAt(0).toUpperCase()}</div>
                <h4>${sanitizar(m.nome||'—')}</h4>
                <small>@${sanitizar(m.usuario||'—')}</small>
                <small>${sanitizar(m.cargo||'—')}</small>
                <span class="badge ${m.mostrarContato!==false?'badge-green':'badge-amber'}">${m.mostrarContato!==false?'Visível no portal':'Oculto'}</span>
                ${m.usuario===usuarioLogado.usuario ? '<span class="badge badge-blue" style="display:block;margin-top:4px;">Você</span>' : ''}
                <div class="membro-actions">
                    <button class="btn btn-sm btn-outline" onclick="editarTecnico('${m.fid}')">✏️</button>
                    ${m.usuario!==usuarioLogado.usuario?`<button class="btn btn-sm btn-danger" onclick="removerTecnico('${m.fid}')">🗑️</button>`:''}
                </div>
            </div>`).join('')}
        </div>`;
    
    window._equipeData = membros;
}

function abrirModalTecnico(id = null) {
    if (id) { const m = window._equipeData?.find(e=>e.fid===id); if(m) mostrarFormTecnico(id,m); }
    else mostrarFormTecnico(null,{});
}

function mostrarFormTecnico(id, u) {
    const cargos = depto==='TI'?['Técnico de Suporte TI','Analista de Sistemas','Analista de Redes','Coordenador de TI']:['Supervisor de Manutenção','Técnico de Manutenção','Eletricista','Encanador','Técnico de Refrigeração'];
    abrirModal(`
        <div class="modal-header"><h3>${id?'✏️ Editar':'👤 Novo Membro'}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <form onsubmit="salvarTecnico(event,'${id||''}')" style="display:grid;gap:10px;">
            <div class="form-group"><label>Nome *</label><input type="text" id="tecNome" required value="${u.nome||''}"></div>
            <div class="form-group"><label>Usuário *</label><input type="text" id="tecUsuario" required value="${u.usuario||''}" ${id?'readonly':''}></div>
            <div class="form-group"><label>Cargo *</label><select id="tecCargo">${cargos.map(c=>`<option ${u.cargo===c?'selected':''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>WhatsApp *</label><input type="text" id="tecWhatsApp" required value="${u.whatsapp||''}"></div>
            <div class="form-group"><label>Mostrar no portal?</label><select id="tecMostrar"><option value="true" ${u.mostrarContato!==false?'selected':''}>✅ Sim</option><option value="false" ${u.mostrarContato===false?'selected':''}>❌ Não</option></select></div>
            ${!id?'<div style="background:#FEF3C7;padding:10px;border-radius:8px;font-size:11px;">🔑 Senha inicial: <strong>12345</strong></div>':''}
            <button type="submit" class="btn btn-primary">💾 Salvar</button>
        </form>`);
}

async function salvarTecnico(e,id){e.preventDefault();const n=document.getElementById('tecNome')?.value.trim(),u=document.getElementById('tecUsuario')?.value.toLowerCase().trim(),w=document.getElementById('tecWhatsApp')?.value.trim(),c=document.getElementById('tecCargo')?.value,m=document.getElementById('tecMostrar')?.value==='true';if(!n||!u||!w||!c){toast('Preencha todos','error');return;}try{if(id){await db.collection('usuarios').doc(id).update({nome:n,cargo:c,whatsapp:w,mostrarContato:m});}else{const ex=await db.collection('usuarios').where('usuario','==',u).get();if(!ex.empty){toast('Usuário já existe','error');return;}await db.collection('usuarios').add({nome:n,usuario:u,senha:'12345',cargo:c,tipo:'tecnico',whatsapp:w,mostrarContato:m,status:'ativo',primeiro_acesso:true,departamento:depto});}document.querySelector('.modal-overlay')?.remove();carregarEquipe();toast('✅ Salvo!','success');}catch(e){toast('Erro','error');}}
function editarTecnico(id){abrirModalTecnico(id);}
async function removerTecnico(id){if(!confirm('Remover?'))return;try{await db.collection('usuarios').doc(id).delete();carregarEquipe();toast('🗑️ Removido!','success');}catch(e){toast('Erro','error');}}