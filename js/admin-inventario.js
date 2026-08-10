// ============================================
// INVENTÁRIO - INTERFACE RENOVADA
// ============================================

function renderInventario() {
    const main = document.getElementById('mainContent');
    
    main.innerHTML = `
    <style>
        .inv-container { max-width: 1100px; margin: 0 auto; }
        .inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; margin-top: 16px; }
        
        .inv-card {
            background: var(--card); border: 1px solid var(--border); border-radius: 16px;
            padding: 18px; cursor: pointer; transition: all 0.3s;
        }
        .inv-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); border-color: var(--primary); }
        .inv-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .inv-card-header h3 { font-size: 15px; color: var(--primary); }
        .inv-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .inv-stat { text-align: center; background: var(--bg); padding: 10px 6px; border-radius: 10px; }
        .inv-stat .num { font-size: 18px; font-weight: 700; color: var(--primary); }
        .inv-stat .lbl { font-size: 9px; color: var(--text-secondary); margin-top: 2px; }
    </style>
    
    <div class="top-bar">
        <div><h1>📊 Inventário</h1><p style="font-size:11px;color:var(--text-secondary);">Equipamentos por setor</p></div>
        <button class="btn btn-primary btn-sm" onclick="abrirModalInv()"><i class="fas fa-plus"></i> Novo Setor</button>
    </div>
    
    <div class="inv-container">
        <div style="display:flex;gap:10px;margin-bottom:16px;">
            <input type="text" id="filtroInv" placeholder="🔍 Filtrar setor..." onkeyup="filtrarInventarioUI()" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--card);color:var(--text);">
        </div>
        <div id="invContent"><div style="text-align:center;padding:40px;"><div class="spinner" style="margin:0 auto;"></div></div></div>
    </div>`;
    
    carregarInventario();
}

async function carregarInventario() {
    const snap = await db.collection('inventario').get();
    inventario = []; snap.forEach(d => { const x = d.data(); x.fid = d.id; inventario.push(x); });
    
    let tC=0,tI=0,tR=0,tTV=0,tRed=0,tO=0;
    inventario.forEach(i => { tC+=parseInt(i.computadores)||0; tI+=parseInt(i.impressoras)||0; tR+=parseInt(i.ramais)||0; tTV+=parseInt(i.tvs)||0; tRed+=parseInt(i.redes)||0; tO+=parseInt(i.outros)||0; });
    const tg = tC+tI+tR+tTV+tRed+tO;
    
    const container = document.getElementById('invContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="info-bar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;padding:14px;">
            <div class="info-item"><div class="info-val">${tg}</div><div class="info-lbl">Total</div></div>
            <div class="info-item"><div class="info-val">${tC}</div><div class="info-lbl">💻 PC</div></div>
            <div class="info-item"><div class="info-val">${tI}</div><div class="info-lbl">🖨️ Imp.</div></div>
            <div class="info-item"><div class="info-val">${tR}</div><div class="info-lbl">📞 Ramal</div></div>
            <div class="info-item"><div class="info-val">${tTV}</div><div class="info-lbl">📺 TV</div></div>
            <div class="info-item"><div class="info-val">${tRed}</div><div class="info-lbl">📡 Rede</div></div>
        </div>
        <div class="inv-grid" id="invGrid">
            ${inventario.sort((a,b)=>a.setor.localeCompare(b.setor)).map(i => {
                const t = (parseInt(i.computadores)||0)+(parseInt(i.impressoras)||0)+(parseInt(i.ramais)||0)+(parseInt(i.tvs)||0)+(parseInt(i.redes)||0)+(parseInt(i.outros)||0);
                return `
                <div class="inv-card" onclick="verDetalhesInv('${i.fid}')">
                    <div class="inv-card-header"><h3>📍 ${sanitizar(i.setor)}</h3><span class="badge badge-blue">${t} equip.</span></div>
                    <div class="inv-stats">
                        <div class="inv-stat"><div class="num">${i.computadores||0}</div><div class="lbl">💻</div></div>
                        <div class="inv-stat"><div class="num">${i.impressoras||0}</div><div class="lbl">🖨️</div></div>
                        <div class="inv-stat"><div class="num">${i.ramais||0}</div><div class="lbl">📞</div></div>
                        <div class="inv-stat"><div class="num">${i.tvs||0}</div><div class="lbl">📺</div></div>
                        <div class="inv-stat"><div class="num">${i.redes||0}</div><div class="lbl">📡</div></div>
                        <div class="inv-stat"><div class="num">${i.outros||0}</div><div class="lbl">📱</div></div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    
    window._invData = inventario;
}

function filtrarInventarioUI() {
    const f = (document.getElementById('filtroInv')?.value||'').toLowerCase();
    let l = window._invData || inventario;
    if (f) l = l.filter(i => i.setor.toLowerCase().includes(f));
    const g = document.getElementById('invGrid');
    if (g) g.innerHTML = l.length===0 ? '<div style="text-align:center;padding:40px;grid-column:1/-1;">Nenhum setor encontrado</div>' : l.sort((a,b)=>a.setor.localeCompare(b.setor)).map(i => {
        const t = (parseInt(i.computadores)||0)+(parseInt(i.impressoras)||0)+(parseInt(i.ramais)||0)+(parseInt(i.tvs)||0)+(parseInt(i.redes)||0)+(parseInt(i.outros)||0);
        return `<div class="inv-card" onclick="verDetalhesInv('${i.fid}')"><div class="inv-card-header"><h3>📍 ${sanitizar(i.setor)}</h3><span class="badge badge-blue">${t} equip.</span></div><div class="inv-stats"><div class="inv-stat"><div class="num">${i.computadores||0}</div><div class="lbl">💻</div></div><div class="inv-stat"><div class="num">${i.impressoras||0}</div><div class="lbl">🖨️</div></div><div class="inv-stat"><div class="num">${i.ramais||0}</div><div class="lbl">📞</div></div><div class="inv-stat"><div class="num">${i.tvs||0}</div><div class="lbl">📺</div></div><div class="inv-stat"><div class="num">${i.redes||0}</div><div class="lbl">📡</div></div><div class="inv-stat"><div class="num">${i.outros||0}</div><div class="lbl">📱</div></div></div></div>`;
    }).join('');
}

function verDetalhesInv(id) {
    const inv = inventario.find(i => i.fid === id);
    if (!inv) return;
    const total = (parseInt(inv.computadores)||0)+(parseInt(inv.impressoras)||0)+(parseInt(inv.ramais)||0)+(parseInt(inv.tvs)||0)+(parseInt(inv.redes)||0)+(parseInt(inv.outros)||0);
    
    abrirModal(`
        <div class="modal-header"><h3>📍 ${sanitizar(inv.setor)} - ${total} equipamentos</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
            <div style="background:#DBEAFE;padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;">💻</div><div style="font-size:22px;font-weight:700;">${inv.computadores||0}</div><small>Computadores</small></div>
            <div style="background:#D1FAE5;padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;">🖨️</div><div style="font-size:22px;font-weight:700;">${inv.impressoras||0}</div><small>Impressoras</small></div>
            <div style="background:#FEF3C7;padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;">📞</div><div style="font-size:22px;font-weight:700;">${inv.ramais||0}</div><small>Ramais</small></div>
            <div style="background:#EDE9FE;padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;">📺</div><div style="font-size:22px;font-weight:700;">${inv.tvs||0}</div><small>TVs</small></div>
            <div style="background:#FEE2E2;padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;">📡</div><div style="font-size:22px;font-weight:700;">${inv.redes||0}</div><small>Redes</small></div>
            <div style="background:#F3F4F6;padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;">📱</div><div style="font-size:22px;font-weight:700;">${inv.outros||0}</div><small>Outros</small></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
            <button class="btn btn-outline btn-sm" onclick="editarInv('${inv.fid}');this.closest('.modal-overlay').remove();">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" onclick="excluirInv('${inv.fid}');this.closest('.modal-overlay').remove();">🗑️ Excluir</button>
        </div>`, '600px');
}

function abrirModalInv(id = null) {
    const item = id ? inventario.find(i => i.fid === id) : null;
    abrirModal(`
        <div class="modal-header"><h3>${id?'✏️ Editar Setor':'📊 Novo Setor'}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <form onsubmit="salvarInv(event,'${id||''}')" style="display:grid;gap:10px;">
            <div class="form-group"><label>Setor *</label><select id="invSetor" required><option value="">Selecione...</option>${setores.map(s=>`<option value="${s}" ${item?.setor===s?'selected':''}>${s}</option>`).join('')}</select></div>
            <div class="form-row"><div class="form-group"><label>💻 Computadores</label><input type="number" id="invComp" value="${item?.computadores||0}" min="0"></div><div class="form-group"><label>🖨️ Impressoras</label><input type="number" id="invImp" value="${item?.impressoras||0}" min="0"></div></div>
            <div class="form-row"><div class="form-group"><label>📞 Ramais</label><input type="number" id="invRam" value="${item?.ramais||0}" min="0"></div><div class="form-group"><label>📺 TVs</label><input type="number" id="invTV" value="${item?.tvs||0}" min="0"></div></div>
            <div class="form-row"><div class="form-group"><label>📡 Redes</label><input type="number" id="invRedes" value="${item?.redes||0}" min="0"></div><div class="form-group"><label>📱 Outros</label><input type="number" id="invOutros" value="${item?.outros||0}" min="0"></div></div>
            <button type="submit" class="btn btn-primary">💾 Salvar</button>
        </form>`);
}

async function salvarInv(e, id) {
    e.preventDefault();
    const d = { setor: document.getElementById('invSetor')?.value, computadores: parseInt(document.getElementById('invComp')?.value)||0, impressoras: parseInt(document.getElementById('invImp')?.value)||0, ramais: parseInt(document.getElementById('invRam')?.value)||0, tvs: parseInt(document.getElementById('invTV')?.value)||0, redes: parseInt(document.getElementById('invRedes')?.value)||0, outros: parseInt(document.getElementById('invOutros')?.value)||0 };
    if (!d.setor) return;
    try { if(id) await db.collection('inventario').doc(id).update(d); else await db.collection('inventario').add(d); document.querySelector('.modal-overlay')?.remove(); carregarInventario(); toast('✅ Salvo!', 'success'); }
    catch(e){toast('Erro','error');}
}
function editarInv(id){abrirModalInv(id);}
async function excluirInv(id){if(!confirm('Excluir?'))return;try{await db.collection('inventario').doc(id).delete();carregarInventario();toast('🗑️ Excluído!','success');}catch(e){toast('Erro','error');}}