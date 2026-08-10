// ============================================
// AGENDA - INTERFACE RENOVADA
// ============================================

function renderAgenda() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
    <style>
        .agenda-grid { display: grid; gap: 12px; margin-top: 16px; }
        .agenda-card {
            background: var(--card); border: 1px solid var(--border); border-radius: 14px;
            padding: 16px; border-left: 4px solid #8B5CF6; transition: all 0.3s; cursor: pointer;
        }
        .agenda-card:hover { transform: translateX(4px); box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .agenda-card.hoje { border-left-color: #EF4444; background: #FFF5F5; }
        .agenda-data { font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px; }
        .agenda-card h4 { font-size: 14px; color: var(--primary); }
    </style>
    <div class="top-bar"><div><h1>📅 Agenda</h1><p style="font-size:11px;color:var(--text-secondary);">Compromissos e agendamentos</p></div><button class="btn btn-primary btn-sm" onclick="abrirModalAgenda()"><i class="fas fa-plus"></i> Novo</button></div>
    <div id="agendaContent"><div style="text-align:center;padding:40px;"><div class="spinner"></div></div></div>`;
    carregarAgenda();
}

async function carregarAgenda() {
    try {
        const s = await db.collection('agenda').orderBy('data','asc').get();
        const itens=[]; s.forEach(d=>{const x=d.data();x.fid=d.id;itens.push(x);});
        const c=document.getElementById('agendaContent');
        if(!c)return;
        if(itens.length===0){c.innerHTML='<div style="text-align:center;padding:60px;">📭 Nenhum compromisso</div>';return;}
        
        const hoje = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
        const agrupado={};
        itens.forEach(a=>{
            const data=toDate(a.data);
            const chave=data.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
            if(!agrupado[chave])agrupado[chave]=[];
            agrupado[chave].push(a);
        });
        
        let html='';
        Object.entries(agrupado).forEach(([dataKey,trocas])=>{
            const isHoje = dataKey === hoje;
            html+=`<div style="margin-bottom:20px;"><h3 style="color:${isHoje?'#EF4444':'var(--primary)'};font-size:14px;">${isHoje?'🔴 HOJE - ':''}${dataKey}</h3>`;
            trocas.forEach(a=>{
                const d=toDate(a.data);
                html+=`<div class="agenda-card ${isHoje?'hoje':''}">
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                        <div><h4>${sanitizar(a.titulo||'—')}</h4>
                        <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">🕐 ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} | 📍 ${sanitizar(a.local||'—')} | 👤 ${sanitizar(a.responsavel||'—')}</div>
                        ${a.descricao?`<p style="font-size:11px;color:var(--text-secondary);margin-top:4px;">${sanitizar(a.descricao)}</p>`:''}</div>
                        <div style="display:flex;gap:4px;"><button class="btn btn-sm btn-outline" onclick="event.stopPropagation();editarAgenda('${a.fid}')">✏️</button><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();excluirAgenda('${a.fid}')">🗑️</button></div>
                    </div></div>`;
            });
            html+='</div>';
        });
        c.innerHTML='<div class="agenda-grid">'+html+'</div>';
    }catch(e){}
}

function abrirModalAgenda(id=null){
    if(id){db.collection('agenda').doc(id).get().then(d=>{if(d.exists)mostrarFormAgenda(id,d.data());});}
    else mostrarFormAgenda(null,{});
}
function mostrarFormAgenda(id,d){
    const ds=d.data?toDate(d.data).toISOString().slice(0,16):'';
    abrirModal(`
        <div class="modal-header"><h3>${id?'✏️ Editar':'📅 Novo'}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <form onsubmit="salvarAgenda(event,'${id||''}')" style="display:grid;gap:10px;">
            <div class="form-group"><label>Título *</label><input type="text" id="agTitulo" required value="${d.titulo||''}"></div>
            <div class="form-row"><div class="form-group"><label>Data/Hora *</label><input type="datetime-local" id="agData" required value="${ds}"></div><div class="form-group"><label>Local</label><input type="text" id="agLocal" value="${d.local||''}"></div></div>
            <div class="form-group"><label>Responsável</label><input type="text" id="agResp" value="${d.responsavel||usuarioLogado.nome}"></div>
            <div class="form-group"><label>Descrição</label><textarea id="agDesc" rows="2">${d.descricao||''}</textarea></div>
            <button type="submit" class="btn btn-primary">💾 Salvar</button>
        </form>`);
}
async function salvarAgenda(e,id){e.preventDefault();const d={titulo:document.getElementById('agTitulo')?.value.trim(),data:firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('agData')?.value)),local:document.getElementById('agLocal')?.value.trim(),responsavel:document.getElementById('agResp')?.value.trim(),descricao:document.getElementById('agDesc')?.value.trim(),criadoPor:usuarioLogado.nome,departamento:depto};if(!d.titulo)return;try{if(id)await db.collection('agenda').doc(id).update(d);else await db.collection('agenda').add(d);document.querySelector('.modal-overlay')?.remove();carregarAgenda();toast('✅ Salvo!','success');}catch(e){toast('Erro','error');}}
function editarAgenda(id){abrirModalAgenda(id);}
async function excluirAgenda(id){if(!confirm('Excluir?'))return;try{await db.collection('agenda').doc(id).delete();carregarAgenda();toast('🗑️ Excluído!','success');}catch(e){toast('Erro','error');}}