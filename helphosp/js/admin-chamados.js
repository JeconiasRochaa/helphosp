// ============================================
// GERENCIAMENTO DE CHAMADOS
// ============================================

function renderChamados() {
    const main = document.getElementById('mainContent');
    const f = chamados.filter(c => c.tipo !== 'gesthosp');

    main.innerHTML = `
    <div class="top-bar">
        <h1><i class="fas fa-ticket"></i> Chamados — ${sanitizar(nomeDepto)} (${f.length})</h1>
        <button class="btn btn-primary btn-sm" onclick="abrirNovoChamadoAdmin()">
            <i class="fas fa-plus"></i> Novo Chamado
        </button>
    </div>
    <div class="filtros-bar">
        <select id="filtroStatus" onchange="filtrarChamadosUI()">
        <option value="">Todos os status</option>
        <option>A Fazer</option>
        <option>Em Andamento</option>
        <option>Pendente</option>
        <option>Concluído</option></select>
        <select id="filtroPrioridade" onchange="filtrarChamadosUI()">
        <option value="">Todas as prioridades</option>
        <option>Baixa</option>
        <option>Média</option>
        <option>Alta</option>
        <option>Crítica</option></select>
        <input type="text" id="filtroBusca" placeholder="Buscar por título ou protocolo..." onkeyup="filtrarChamadosUI()">
    </div>
    <div class="table-card"><table>
        <thead><tr><th></th><th>Protocolo</th><th>Data</th><th>Título</th><th>Solicitante</th><th>Contato</th><th>Setor</th><th>Prioridade</th><th>Status</th><th>SLA</th><th>Ações</th></tr></thead>
        <tbody id="tabelaChamados">${renderLinhasChamados(f)}</tbody>
    </table></div>`;
}

function renderLinhasChamados(l) {
    if (l.length === 0) return '<tr><td colspan="11" style="text-align:center;padding:26px;color:var(--text-2);"><i class="fas fa-inbox" style="font-size:22px;display:block;margin-bottom:8px;opacity:.6;"></i>Nenhum chamado encontrado</td></tr>';
    return l.slice().sort((a, b) => toDate(b.data_abertura) - toDate(a.data_abertura)).map(c => {
        const concluido = c.status === 'Concluído';
        const donoOutro = !!c.tecnico && c.tecnico !== usuarioLogado.nome && !getPerms().isAdmin;

        let ac = '';
        if (concluido) {
            ac += getPerms().isAdmin
                ? `<button class="btn btn-sm btn-outline" title="Reabrir chamado" onclick="event.stopPropagation();reabrirChamado('${c.fid}')"><i class="fas fa-rotate-left"></i></button>`
                : `<span class="badge badge-green" title="Chamado concluído"><i class="fas fa-check"></i> Concluído</span>`;
        } else if (donoOutro) {
            ac += `<span class="badge badge-amber" title="Em atendimento por ${sanitizar(c.tecnico)}"><i class="fas fa-lock"></i> ${sanitizar(c.tecnico)}</span>`;
        } else {
            ac += `<button class="btn btn-sm btn-primary" title="Avançar status" onclick="event.stopPropagation();mudarStatusChamado('${c.fid}')"><i class="fas fa-forward"></i></button>`;
        }

        if (!concluido) {
            ac += `<button class="btn btn-sm btn-outline" title="Adicionar foto" onclick="event.stopPropagation();abrirUploadFotoChamado('${c.fid}')"><i class="fas fa-camera"></i></button>`;
            if (depto === 'MANUTENCAO') ac += `<button class="btn btn-sm btn-outline" title="Atribuir executante" onclick="event.stopPropagation();atribuirExecutante('${c.fid}')"><i class="fas fa-helmet-safety"></i></button>`;
        }
        ac += `<button class="btn btn-sm btn-outline" title="Comentários" onclick="event.stopPropagation();abrirComentarios('${c.fid}')"><i class="fas fa-comment"></i></button>`;
        if (getPerms().isAdmin) ac += `<button class="btn btn-sm btn-danger" title="Excluir" onclick="event.stopPropagation();excluirChamado('${c.fid}')"><i class="fas fa-trash"></i></button>`;

        let contato = sanitizar(c.contato || '—');
        if (c.contato && c.contato.replace(/\D/g, '').length >= 10) {
            const num = c.contato.replace(/\D/g, '');
            contato = `<a href="https://wa.me/55${num}" target="_blank" rel="noopener" style="color:#25D366;text-decoration:none;" onclick="event.stopPropagation();"><i class="fab fa-whatsapp"></i> ${sanitizar(c.contato)}</a>`;
        }

        const fotos = Array.isArray(c.fotos) ? c.fotos : [];
        const celFoto = fotos.length
            ? `<img class="td-foto" src="${sanitizar(fotos[0])}" alt="Foto do chamado" loading="lazy"
                    onclick="event.stopPropagation();HH.lightbox('${sanitizar(fotos[0])}')"
                    onerror="this.style.display='none'">
               ${fotos.length > 1 ? `<div class="foto-count" style="margin-top:3px;"><i class="fas fa-camera"></i> ${fotos.length}</div>` : ''}`
            : '<i class="fas fa-image" style="color:var(--muted);"></i>';

        return `<tr onclick="verDetalhes('${c.fid}')">
            <td>${celFoto}</td>
            <td><strong>${sanitizar(c.protocolo||'—')}</strong></td><td>${fmtDataCurta(c.data_abertura)}</td>
            <td>${sanitizar(c.titulo||'—')}</td><td>${sanitizar(c.solicitante||'—')}</td>
            <td>${contato}</td><td>${sanitizar(c.setor||'—')}</td>
            <td><span class="badge ${getPrioridadeClass(c.prioridade)}">${sanitizar(c.prioridade||'—')}</span></td>
            <td><span class="badge ${getStatusClass(c.status)}">${sanitizar(c.status||'—')}</span></td>
            <td><span class="sla-alert ${getSLAStatus(c)}">${getSLATexto(c)}</span></td>
            <td onclick="event.stopPropagation();" style="white-space:nowrap;">${ac}</td></tr>`;
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
    console.log('Avançando status do chamado:', id);

    try {
        const docRef = db.collection('chamados').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            toast('Chamado não encontrado', 'error');
            return;
        }

        const dados = doc.data();
        const statusAtual = dados.status || 'A Fazer';

        // Chamado concluído é definitivo: não pode voltar de status por engano.
        // Reabertura, se necessária, é uma decisão deliberada do admin (reabrirChamado).
        if (statusAtual === 'Concluído') {
            HH.aviso('Este chamado já foi concluído. Use "Reabrir" caso seja necessário retomar o atendimento.', {
                titulo: 'Chamado concluído'
            });
            return;
        }

        // Posse do chamado: uma vez que alguém iniciou (ou criou) o atendimento,
        // só quem está atribuído (ou um admin) pode dar continuidade — evita
        // dois técnicos mexendo no mesmo chamado ao mesmo tempo.
        const donoAtual = dados.tecnico;
        const souDono = !donoAtual || donoAtual === usuarioLogado.nome;
        if (!souDono && !getPerms().isAdmin) {
            HH.aviso(`Este chamado já está sendo atendido por ${donoAtual}. Apenas ${donoAtual} ou um administrador pode avançar o status.`, {
                titulo: 'Chamado em atendimento'
            });
            return;
        }

        const fluxo = {
            'A Fazer': 'Em Andamento',
            'Em Andamento': 'Pendente',
            'Pendente': 'Concluído'
        };

        const novoStatus = fluxo[statusAtual];
        if (!novoStatus) {
            HH.aviso('Não há um próximo status para este chamado.');
            return;
        }

        const atualizacao = {
            status: novoStatus,
            data_atualizacao: firebase.firestore.Timestamp.now()
        };

        // O primeiro a mexer no chamado "assume" o atendimento (se ainda não tinha dono)
        if (!dados.tecnico) {
            atualizacao.tecnico = usuarioLogado.nome;
        }
        if (novoStatus === 'Concluído') {
            atualizacao.concluido_por = usuarioLogado.nome;
            atualizacao.data_conclusao = firebase.firestore.Timestamp.now();
        }

        const timeline = dados.timeline || [];
        timeline.push({
            data: new Date().toISOString(),
            status: novoStatus,
            acao: `Status alterado para "${novoStatus}" por ${usuarioLogado.nome}`
        });
        atualizacao.timeline = timeline;

        await docRef.update(atualizacao);
        toast('Status atualizado: ' + novoStatus, 'success');

    } catch (erro) {
        console.error('Erro:', erro);
        toast('Erro ao atualizar', 'error');
    }
}

/**
 * Reabertura deliberada de um chamado concluído — só admin, e sempre
 * registrada na timeline para manter o histórico auditável.
 */
async function reabrirChamado(id) {
    if (!getPerms().isAdmin) {
        HH.aviso('Somente um administrador pode reabrir um chamado concluído.');
        return;
    }

    const ok = await HH.confirmar('O chamado voltará para "Em Andamento" e ficará novamente na fila do técnico responsável.', {
        titulo: 'Reabrir chamado',
        confirmar: 'Reabrir',
        variante: 'warning'
    });
    if (!ok) return;

    try {
        const docRef = db.collection('chamados').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) { toast('Chamado não encontrado', 'error'); return; }
        const dados = doc.data();

        const timeline = dados.timeline || [];
        timeline.push({
            data: new Date().toISOString(),
            status: 'Em Andamento',
            acao: `Chamado reaberto por ${usuarioLogado.nome} (administrador)`
        });

        await docRef.update({
            status: 'Em Andamento',
            data_atualizacao: firebase.firestore.Timestamp.now(),
            timeline
        });
        toast('Chamado reaberto.', 'success');
        document.querySelector('.modal-overlay')?.remove();
    } catch (erro) {
        console.error(erro);
        toast('Erro ao reabrir chamado', 'error');
    }
}

// ============================================
// NOVO CHAMADO PELO ADMIN
// ============================================
function abrirNovoChamadoAdmin() {
    const categorias = CATEGORIAS_PADRAO && CATEGORIAS_PADRAO[depto] ? CATEGORIAS_PADRAO[depto] : (depto === 'TI' ?
        ['Computador sem internet','Computador não liga','Computador lento','Monitor com defeito','Teclado/Mouse quebrado','Impressora não funciona','Impressora sem tinta','Sistema fora do ar','Sistema com erro','Rede fora do ar','Internet lenta','Wi-Fi não conecta','Senha bloqueada','Acesso ao sistema','Ramal sem funcionar','Instalação de programas','Cabo de rede danificado','Outros - TI'] :
        ['Problema elétrico','Tomada quebrada','Lâmpada queimada','Disjuntor desarmando','Vazamento de água','Torneira pingando','Descarga com problema','Pia entupida','Ar-condicionado não gela','Ar-condicionado pingando','Pintura danificada','Parede com infiltração','Móvel quebrado','Porta com problema','Janela quebrada','Telhado com goteira','Piso danificado','Fechadura com defeito','Outros - Manutenção']);

    const setorOptions = setores.map(s => `<option value="${s}">${s}</option>`).join('');
    const catOptions = categorias.map(c => `<option value="${c}">${c}</option>`).join('');

    abrirModal(`
        <div class="modal-header"><h3><i class="fas fa-plus"></i> Novo Chamado — ${sanitizar(nomeDepto)}</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <form onsubmit="criarChamadoAdmin(event)" style="display:grid;gap:10px;">
            <div class="form-row"><div class="form-group"><label>Solicitante *</label><input type="text" id="admSolicitante" required></div><div class="form-group"><label>Contato</label><input type="text" id="admContato" placeholder="WhatsApp/Ramal"></div></div>
            <div class="form-row"><div class="form-group"><label>Setor *</label><select id="admSetor" required><option value="">Selecione...</option>${setorOptions}</select></div><div class="form-group"><label>Categoria *</label><select id="admCategoria" required><option value="">Selecione...</option>${catOptions}</select></div></div>
            <div class="form-row"><div class="form-group"><label>Prioridade *</label><select id="admPrioridade" required><option value="Baixa">Baixa</option><option value="Média" selected>Média</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option></select></div><div class="form-group"><label>Técnico responsável</label><input type="text" id="admTecnico" value="${sanitizar(usuarioLogado.nome)}" readonly></div></div>
            <div class="form-group"><label>Título *</label><input type="text" id="admTitulo" required></div>
            <div class="form-group"><label>Descrição</label><textarea id="admDescricao" rows="3"></textarea></div>
            <div class="form-group">
                <label>Fotos (opcional)</label>
                <input type="file" id="admFotoInput" accept="image/*" multiple style="padding:8px;border:2px dashed var(--border);border-radius:8px;width:100%;">
                <div class="foto-preview-grid" id="admFotoPreview" style="margin-top:8px;"></div>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;"><button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancelar</button><button type="submit" class="btn btn-primary" id="admBtnCriar"><i class="fas fa-paper-plane"></i> Criar Chamado</button></div>
        </form>`, '650px');

    window.__admFotosNovoChamado = [];
    setTimeout(() => {
        const input = document.getElementById('admFotoInput');
        if (!input) return;
        input.addEventListener('change', () => {
            window.__admFotosNovoChamado = Array.from(input.files || []).slice(0, 5);
            const grid = document.getElementById('admFotoPreview');
            if (!grid) return;
            grid.innerHTML = window.__admFotosNovoChamado.map(f =>
                `<div class="foto-thumb"><img src="${URL.createObjectURL(f)}" alt=""></div>`
            ).join('');
        });
    }, 200);
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

    const btn = document.getElementById('admBtnCriar');
    const arquivos = window.__admFotosNovoChamado || [];
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...'; }

    try {
        const protocolo = 'CH-' + Date.now().toString(36).toUpperCase().slice(-8);

        let fotos = [];
        if (arquivos.length && typeof storage !== 'undefined' && storage) {
            try { fotos = await enviarFotosAdmin(arquivos, `chamados/${protocolo}`); }
            catch (e) { console.error(e); toast('Chamado será criado, mas houve falha ao enviar as fotos.', 'warning'); }
        }

        await db.collection('chamados').add({
            protocolo, departamento: depto, tipo: 'chamado', titulo, descricao,
            solicitante, contato, setor, categoria, prioridade,
            status: 'A Fazer', tecnico: usuarioLogado.nome,
            fotos, temFoto: fotos.length > 0,
            data_abertura: firebase.firestore.Timestamp.now(),
            timeline: [{ data: new Date().toISOString(), status: 'A Fazer', acao: `Aberto por ${usuarioLogado.nome}` + (fotos.length ? ` com ${fotos.length} foto(s)` : '') }]
        });
        window.__admFotosNovoChamado = [];
        document.querySelector('.modal-overlay')?.remove();
        toast('Chamado criado! Protocolo: ' + protocolo, 'success');
    } catch (erro) {
        console.error(erro);
        toast('Erro ao criar chamado', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Criar Chamado'; }
    }
}

/**
 * Anexa uma ou mais fotos a um chamado já existente — usado pela equipe
 * técnica para documentar o atendimento (antes/depois, peça trocada etc.).
 */
function abrirUploadFotoChamado(id) {
    const c = chamados.find(x => x.fid === id);
    if (!c) return;

    abrirModal(`
        <div class="modal-header"><h3><i class="fas fa-camera"></i> Adicionar foto ao chamado</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>
        <p style="font-size:12px;color:var(--text-2);margin-bottom:10px;">${sanitizar(c.protocolo||'')} — ${sanitizar(c.titulo||'')}</p>
        <div class="form-group">
            <input type="file" id="chFotoInput" accept="image/*" capture="environment" multiple style="padding:8px;border:2px dashed var(--border);border-radius:8px;width:100%;">
        </div>
        <div class="foto-preview-grid" id="chFotoPreview"></div>
        <div class="upload-progress" id="chFotoProgress"><div class="upload-progress__bar" id="chFotoProgressBar"></div></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            <button type="button" class="btn btn-primary btn-sm" id="chFotoBtn" onclick="enviarFotoParaChamado('${id}')"><i class="fas fa-upload"></i> Enviar</button>
        </div>`, '480px');

    window.__chFotosSelecionadas = [];
    setTimeout(() => {
        const input = document.getElementById('chFotoInput');
        if (!input) return;
        input.addEventListener('change', () => {
            window.__chFotosSelecionadas = Array.from(input.files || []).slice(0, 5);
            const grid = document.getElementById('chFotoPreview');
            if (!grid) return;
            grid.innerHTML = window.__chFotosSelecionadas.map(f =>
                `<div class="foto-thumb"><img src="${URL.createObjectURL(f)}" alt=""></div>`
            ).join('');
        });
    }, 200);
}

async function enviarFotoParaChamado(id) {
    const arquivos = window.__chFotosSelecionadas || [];
    if (!arquivos.length) { toast('Selecione ao menos uma foto', 'error'); return; }
    if (typeof storage === 'undefined' || !storage) { toast('Upload de fotos indisponível no momento.', 'error'); return; }

    const btn = document.getElementById('chFotoBtn');
    const barra = document.getElementById('chFotoProgress');
    const barraFill = document.getElementById('chFotoProgressBar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; }
    if (barra) barra.classList.add('show');

    try {
        const urls = await enviarFotosAdmin(arquivos, `chamados/${id}/equipe`, pct => { if (barraFill) barraFill.style.width = pct + '%'; });

        const docRef = db.collection('chamados').doc(id);
        const doc = await docRef.get();
        const dados = doc.data() || {};
        const fotosEquipe = Array.isArray(dados.fotos_equipe) ? dados.fotos_equipe : [];
        const timeline = dados.timeline || [];
        timeline.push({
            data: new Date().toISOString(),
            status: dados.status || 'Em Andamento',
            acao: `${usuarioLogado.nome} anexou ${urls.length} foto(s) ao atendimento`
        });

        await docRef.update({
            fotos_equipe: fotosEquipe.concat(urls),
            timeline
        });

        document.querySelector('.modal-overlay')?.remove();
        toast(`${urls.length} foto(s) anexada(s) ao chamado.`, 'success');
    } catch (erro) {
        console.error(erro);
        toast('Erro ao enviar fotos', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Enviar'; }
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
    const ok = await HH.confirmar('Este chamado e seu histórico serão excluídos permanentemente. Esta ação não pode ser desfeita.', {
        titulo: 'Excluir chamado',
        confirmar: 'Excluir'
    });
    if (!ok) return;
    try {
        await db.collection('chamados').doc(id).delete();
        document.querySelector('.modal-overlay')?.remove();
        toast('Chamado excluído.', 'success');
    } catch (e) {
        toast('Não foi possível excluir o chamado.', 'error');
    }
}

function verDetalhes(id) {
    const c = chamados.find(x => x.fid === id);
    if (!c) return;
    if (c.tipo === 'gesthosp') { verDetalhesGestHosp(c); return; }

    let contatoInfo = sanitizar(c.contato || '—');
    if (c.contato && c.contato.replace(/\D/g,'').length >= 10) {
        const num = c.contato.replace(/\D/g,'');
        contatoInfo = `<a href="https://wa.me/55${num}" target="_blank" rel="noopener" style="color:#25D366;"><i class="fab fa-whatsapp"></i> ${sanitizar(c.contato)}</a>`;
    }

    const fotos = Array.isArray(c.fotos) ? c.fotos : [];
    const fotosEquipe = Array.isArray(c.fotos_equipe) ? c.fotos_equipe : [];

    const galeria = (lista, rotulo) => lista.length ? `
    <div class="box-info">
        <h4><i class="fas fa-camera"></i> ${rotulo} (${lista.length})</h4>
        <div class="fotos-chamado">
            ${lista.map(url => `<img src="${sanitizar(url)}" alt="Foto do chamado" loading="lazy" onclick="HH.lightbox('${sanitizar(url)}')" onerror="this.style.display='none'">`).join('')}
        </div>
    </div>` : '';

    const concluido = c.status === 'Concluído';
    const donoOutro = !!c.tecnico && c.tecnico !== usuarioLogado.nome && !getPerms().isAdmin;

    let botaoStatus;
    if (concluido) {
        botaoStatus = getPerms().isAdmin
            ? `<button class="btn btn-outline btn-sm" onclick="reabrirChamado('${c.fid}');"><i class="fas fa-rotate-left"></i> Reabrir chamado</button>`
            : `<span class="badge badge-green" style="padding:8px 14px;"><i class="fas fa-check"></i> Chamado concluído</span>`;
    } else if (donoOutro) {
        botaoStatus = `<span class="badge badge-amber" style="padding:8px 14px;"><i class="fas fa-lock"></i> Em atendimento por ${sanitizar(c.tecnico)}</span>`;
    } else {
        botaoStatus = `<button class="btn btn-primary btn-sm" onclick="mudarStatusChamado('${c.fid}');this.closest('.modal-overlay').remove();"><i class="fas fa-forward"></i> Avançar status</button>`;
    }

    const cont = `
    <div class="hero-chamado">
        <h3>${sanitizar(c.titulo||'Sem título')}</h3>
        <p><i class="fas fa-hashtag"></i> Protocolo ${sanitizar(c.protocolo||'—')} &nbsp;·&nbsp; <i class="fas fa-calendar"></i> ${fmtData(c.data_abertura)}</p>
    </div>
    <div class="box-ok">
        <h4><i class="fas fa-user"></i> Solicitante</h4>
        <div class="detalhe-grid">
            <div class="dado-item"><strong>Nome:</strong> ${sanitizar(c.solicitante||'—')}</div>
            <div class="dado-item"><strong>Contato:</strong> ${contatoInfo}</div>
            <div class="dado-item"><strong>Setor:</strong> ${sanitizar(c.setor||'—')}</div>
            <div class="dado-item"><strong>Departamento:</strong> ${(c.departamento||'TI')==='TI' ? 'TI' : 'Manutenção'}</div>
        </div>
    </div>
    <div class="box-info">
        <h4><i class="fas fa-ticket"></i> Chamado</h4>
        <div class="detalhe-grid">
            <div class="dado-item"><strong>Prioridade:</strong> ${sanitizar(c.prioridade||'—')}</div>
            <div class="dado-item"><strong>Status:</strong> ${sanitizar(c.status||'—')}</div>
            <div class="dado-item"><strong>Categoria:</strong> ${sanitizar(c.categoria||'—')}</div>
            <div class="dado-item"><strong>Técnico responsável:</strong> ${sanitizar(c.tecnico||'Ainda não atribuído')}</div>
            ${c.executante ? `<div class="dado-item"><strong>Executante:</strong> ${sanitizar(c.executante)}</div>` : ''}
            <div class="dado-item"><strong>SLA:</strong> <span class="sla-alert ${getSLAStatus(c)}">${getSLATexto(c)}</span></div>
        </div>
    </div>
    ${c.descricao ? `<div class="box-warn"><h4><i class="fas fa-align-left"></i> Descrição</h4><p style="white-space:pre-wrap;">${sanitizar(c.descricao)}</p></div>` : ''}
    ${galeria(fotos, 'Fotos do solicitante')}
    ${galeria(fotosEquipe, 'Fotos da equipe técnica')}
    <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
        ${botaoStatus}
        ${!concluido ? `<button class="btn btn-outline btn-sm" onclick="abrirUploadFotoChamado('${c.fid}');"><i class="fas fa-camera"></i> Adicionar foto</button>` : ''}
        ${!concluido && depto==='MANUTENCAO' ? `<button class="btn btn-outline btn-sm" onclick="atribuirExecutante('${c.fid}');this.closest('.modal-overlay').remove();"><i class="fas fa-helmet-safety"></i> Executante</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="abrirComentarios('${c.fid}');this.closest('.modal-overlay').remove();"><i class="fas fa-comment"></i> Comentários</button>
        ${getPerms().isAdmin ? `<button class="btn btn-danger btn-sm" onclick="excluirChamado('${c.fid}');this.closest('.modal-overlay').remove();"><i class="fas fa-trash"></i> Excluir</button>` : ''}
    </div>`;

    abrirModal(`<div class="modal-header"><h3><i class="fas fa-circle-info"></i> Detalhes do chamado</h3><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button></div>${cont}`, '750px');
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
