// ============================================
// BANCO DE FOTOS — registro fotográfico geral
// ============================================

const CATEGORIAS_FOTO = {
    defeito: { icone: 'fa-triangle-exclamation', label: 'Defeito', cor: 'red' },
    instalacao: { icone: 'fa-plug-circle-check', label: 'Instalação', cor: 'green' },
    servico: { icone: 'fa-screwdriver-wrench', label: 'Serviço', cor: 'blue' },
    antes: { icone: 'fa-clock-rotate-left', label: 'Antes', cor: 'amber' },
    depois: { icone: 'fa-circle-check', label: 'Depois', cor: 'teal' },
    geral: { icone: 'fa-image', label: 'Geral', cor: 'purple' }
};

function renderArquivos() {
    const main = document.getElementById('mainContent');
    const opcoesCat = Object.entries(CATEGORIAS_FOTO).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

    main.innerHTML = `
    <div class="top-bar">
        <div><h1><i class="fas fa-images"></i> Banco de Fotos</h1><p style="font-size:11px;color:var(--text-2);">Registro fotográfico de atendimentos e instalações</p></div>
        <button class="btn btn-primary btn-sm" onclick="abrirUploadFoto()"><i class="fas fa-upload"></i> Nova Foto</button>
    </div>
    <div class="filtros-bar">
        <select id="filtroCatFoto" onchange="carregarFotos()"><option value="">Todas as categorias</option>${opcoesCat}</select>
    </div>
    <div class="fotos-grid" id="listaFotos"><div style="text-align:center;padding:40px;grid-column:1/-1;"><div class="spinner"></div></div></div>`;
    carregarFotos();
}

async function carregarFotos() {
    try {
        const cat = document.getElementById('filtroCatFoto')?.value || '';
        let q = db.collection('arquivos').orderBy('data', 'desc');
        if (!getPerms().isAdmin) q = q.where('departamento', '==', depto);

        const snap = await q.limit(80).get();
        let fotos = [];
        snap.forEach(d => { const x = d.data(); x.id = d.id; fotos.push(x); });
        if (cat) fotos = fotos.filter(x => x.categoria === cat);
        fotos = fotos.slice(0, 60);

        const container = document.getElementById('listaFotos');
        if (!container) return;

        if (!fotos.length) {
            container.innerHTML = `<div class="vazio-estado" style="grid-column:1/-1;"><div class="emoji"><i class="fas fa-images"></i></div><h3>Nenhuma foto registrada</h3><p>Envie a primeira foto para começar o registro.</p></div>`;
            return;
        }

        container.innerHTML = fotos.map(x => {
            const catInfo = CATEGORIAS_FOTO[x.categoria] || CATEGORIAS_FOTO.geral;
            return `
            <div class="foto-card">
                <img src="${sanitizar(x.url)}" alt="${sanitizar(x.descricao || catInfo.label)}" loading="lazy"
                     onclick="HH.lightbox('${sanitizar(x.url)}')"
                     onerror="this.style.display='none'">
                <div class="foto-info">
                    <span class="badge badge-${catInfo.cor}"><i class="fas ${catInfo.icone}"></i> ${catInfo.label}</span>
                    ${x.descricao ? `<p style="font-size:11px;margin-top:6px;color:var(--text);">${sanitizar(x.descricao)}</p>` : ''}
                    <small style="display:block;margin-top:6px;">${fmtDataCurta(x.data)} · ${sanitizar(x.autor || '—')}</small>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();excluirFoto('${x.id}')" style="margin-top:8px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error(e);
        toast('Erro ao carregar fotos', 'error');
    }
}

function abrirUploadFoto() {
    const opcoesCat = Object.entries(CATEGORIAS_FOTO).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

    abrirModal(`
        <div class="modal-header"><h3><i class="fas fa-cloud-arrow-up"></i> Enviar foto</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <div style="display:grid;gap:10px;">
            <div class="form-group"><label>Categoria</label><select id="fotoCat">${opcoesCat}</select></div>
            <div class="form-group"><label>Descrição</label><textarea id="fotoDesc" rows="2" placeholder="O que a foto documenta..."></textarea></div>
            <div class="form-group"><label>Arquivo * (máx. 10 MB)</label><input type="file" id="fotoArq" accept="image/*" capture="environment" required style="padding:8px;border:2px dashed var(--border);border-radius:8px;width:100%;"></div>
            <div id="previewContainer" style="display:none;text-align:center;"><img id="previewImg" style="max-width:100%;max-height:240px;border-radius:10px;border:1px solid var(--border);"></div>
            <div class="upload-progress" id="progressoContainer"><div class="upload-progress__bar" id="barraProgresso"></div></div>
            <button type="button" class="btn btn-primary" id="btnUpload" onclick="uploadFoto()"><i class="fas fa-cloud-arrow-up"></i> Enviar</button>
        </div>`);

    setTimeout(() => {
        const input = document.getElementById('fotoArq');
        if (!input) return;
        input.addEventListener('change', function () {
            const f = this.files[0];
            if (!f) return;
            if (!f.type.startsWith('image/')) { toast('Selecione um arquivo de imagem', 'error'); this.value = ''; return; }
            if (f.size > 10 * 1024 * 1024) { toast('O arquivo passa de 10 MB', 'error'); this.value = ''; return; }
            const r = new FileReader();
            r.onload = e => {
                document.getElementById('previewContainer').style.display = 'block';
                document.getElementById('previewImg').src = e.target.result;
            };
            r.readAsDataURL(f);
        });
    }, 200);
}

async function uploadFoto() {
    const file = document.getElementById('fotoArq')?.files[0];
    if (!file) { toast('Selecione um arquivo', 'error'); return; }

    const btn = document.getElementById('btnUpload');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    document.getElementById('progressoContainer').classList.add('show');

    try {
        const urls = await enviarFotosAdmin([file], 'fotos-gerais', pct => {
            document.getElementById('barraProgresso').style.width = pct + '%';
        });

        if (!urls.length) throw new Error('Falha no upload');

        await db.collection('arquivos').add({
            url: urls[0],
            categoria: document.getElementById('fotoCat')?.value || 'geral',
            descricao: document.getElementById('fotoDesc')?.value || '',
            autor: usuarioLogado.nome,
            departamento: depto,
            data: firebase.firestore.Timestamp.now()
        });

        document.querySelector('.modal-overlay')?.remove();
        carregarFotos();
        toast('Foto enviada com sucesso.', 'success');
    } catch (e) {
        console.error(e);
        toast('Erro ao enviar a foto', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Enviar';
    }
}

async function excluirFoto(id) {
    const ok = await HH.confirmar('Esta foto será apagada permanentemente do servidor.', { titulo: 'Excluir foto', confirmar: 'Excluir' });
    if (!ok) return;
    try {
        await db.collection('arquivos').doc(id).delete();
        carregarFotos();
        toast('Foto excluída.', 'success');
    } catch (e) {
        toast('Erro ao excluir', 'error');
    }
}
