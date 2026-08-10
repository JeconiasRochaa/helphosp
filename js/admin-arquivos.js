// ============================================
// ARQUIVOS - INTERFACE RENOVADA
// ============================================

function renderArquivos() {
    const main = document.getElementById('mainContent');
    main.innerHTML = `
    <style>
        .fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin-top: 16px; }
        .foto-card {
            background: var(--card); border-radius: 14px; overflow: hidden; border: 1px solid var(--border);
            transition: all 0.3s; cursor: pointer;
        }
        .foto-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
        .foto-card img { width: 100%; height: 160px; object-fit: cover; }
        .foto-info { padding: 12px; }
        .foto-info strong { font-size: 12px; display: block; }
        .foto-info small { font-size: 10px; color: var(--text-secondary); }
    </style>
    <div class="top-bar"><div><h1>📁 Arquivos</h1><p style="font-size:11px;color:var(--text-secondary);">Registro fotográfico</p></div><button class="btn btn-primary btn-sm" onclick="abrirUploadFoto()"><i class="fas fa-upload"></i> Nova Foto</button></div>
    <div class="filtros-bar"><select id="filtroCatFoto" onchange="carregarFotos()" style="padding:8px 12px;border-radius:8px;"><option value="">Todas</option><option value="defeito">🔴 Defeito</option><option value="instalacao">🟢 Instalação</option><option value="servico">🔧 Serviço</option><option value="antes">📸 Antes</option><option value="depois">📸 Depois</option><option value="geral">📷 Geral</option></select></div>
    <div class="fotos-grid" id="listaFotos"><div style="text-align:center;padding:40px;"><div class="spinner"></div></div></div>`;
    carregarFotos();
}

async function carregarFotos() {
    try {
        const cat = document.getElementById('filtroCatFoto')?.value||'';
        let q = db.collection('arquivos').orderBy('data','desc'); if(cat) q = q.where('categoria','==',cat);
        const s = await q.limit(50).get(); const f=[]; s.forEach(d=>{const x=d.data();x.id=d.id;f.push(x);});
        const c = document.getElementById('listaFotos');
        if(c) c.innerHTML = f.length===0 ? '<div style="text-align:center;padding:60px;grid-column:1/-1;">📭 Nenhuma foto</div>' : f.map(x=>`
            <div class="foto-card" onclick="window.open('${x.url}','_blank')">
                <img src="${x.url}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23E2E8F0%22 width=%22300%22 height=%22200%22/></svg>'">
                <div class="foto-info">
                    <strong>${sanitizar(x.categoria||'Geral')}</strong>
                    <small>${fmtDataCurta(x.data)} • ${sanitizar(x.autor||'—')}</small>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();excluirFoto('${x.id}')" style="margin-top:6px;">🗑️</button>
                </div>
            </div>`).join('');
    }catch(e){}
}

function abrirUploadFoto() {
    abrirModal(`
        <div class="modal-header"><h3>📤 Upload de Foto</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <div style="display:grid;gap:10px;">
            <div class="form-group"><label>Categoria</label><select id="fotoCat"><option value="defeito">🔴 Defeito</option><option value="instalacao">🟢 Instalação</option><option value="servico">🔧 Serviço</option><option value="antes">📸 Antes</option><option value="depois">📸 Depois</option><option value="geral">📷 Geral</option></select></div>
            <div class="form-group"><label>Descrição</label><textarea id="fotoDesc" rows="2"></textarea></div>
            <div class="form-group"><label>Arquivo * (máx 10MB)</label><input type="file" id="fotoArq" accept="image/*" required style="padding:8px;border:2px dashed var(--border);border-radius:8px;"></div>
            <div id="previewContainer" style="display:none;text-align:center;"><img id="previewImg" style="max-width:100%;max-height:250px;border-radius:8px;"></div>
            <div id="progressoContainer" style="display:none;"><div style="background:#E2E8F0;border-radius:8px;height:8px;"><div id="barraProgresso" style="background:var(--success);height:100%;width:0;border-radius:8px;"></div></div><small id="progressoTexto">0%</small></div>
            <button type="button" class="btn btn-primary" id="btnUpload" onclick="uploadFoto()"><i class="fas fa-cloud-upload-alt"></i> Enviar</button>
        </div>`);
    setTimeout(()=>{const i=document.getElementById('fotoArq');if(i)i.addEventListener('change',function(){const f=this.files[0];if(!f)return;if(!f.type.startsWith('image/')){toast('Apenas imagens','error');this.value='';return;}if(f.size>10*1024*1024){toast('Máximo 10MB','error');this.value='';return;}const r=new FileReader();r.onload=e=>{document.getElementById('previewContainer').style.display='block';document.getElementById('previewImg').src=e.target.result;};r.readAsDataURL(f);});},300);
}

async function uploadFoto() {
    const file=document.getElementById('fotoArq')?.files[0];if(!file){toast('Selecione','error');return;}
    const btn=document.getElementById('btnUpload');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Enviando...';
    document.getElementById('progressoContainer').style.display='block';
    try {
        const nome=`fotos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
        const task=storage.ref(nome).put(file);
        task.on('state_changed',snap=>{const p=(snap.bytesTransferred/snap.totalBytes)*100;document.getElementById('barraProgresso').style.width=p+'%';document.getElementById('progressoTexto').textContent=Math.round(p)+'%';},
        err=>{toast('Erro: '+err.message,'error');btn.disabled=false;btn.innerHTML='Enviar';},
        async()=>{const url=await task.snapshot.ref.getDownloadURL();await db.collection('arquivos').add({url,categoria:document.getElementById('fotoCat')?.value||'geral',descricao:document.getElementById('fotoDesc')?.value||'',autor:usuarioLogado.nome,departamento:depto,data:firebase.firestore.Timestamp.now(),nomeArquivo:nome});document.querySelector('.modal-overlay')?.remove();carregarFotos();toast('✅ Enviada!','success');});
    }catch(e){toast('Erro','error');btn.disabled=false;btn.innerHTML='Enviar';}
}

async function excluirFoto(id){if(!confirm('Excluir?'))return;try{await db.collection('arquivos').doc(id).delete();carregarFotos();toast('🗑️ Excluída!','success');}catch(e){toast('Erro','error');}}