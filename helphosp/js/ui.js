// ============================================================
// INTERFACE DO PORTAL PÚBLICO
// ============================================================

const esc = s => HH.esc(s);

// ============================================================
// GRID DE DEPARTAMENTOS
// ============================================================

function renderizarActionGrid(departamentos) {
    const grid = document.getElementById('actionGrid');
    if (!grid) return;

    let html = '';

    departamentos.forEach((dep, index) => {
        const info = DEPARTAMENTO_INFO[dep] || {
            icone: 'fa-building',
            titulo: dep,
            descricao: `Abrir chamado para ${dep}`
        };
        const cor = CORES_DEPARTAMENTO[index % CORES_DEPARTAMENTO.length];

        html += `
        <div class="action-card card-${cor}" onclick="window.app.abrirFormulario('${esc(dep)}')" role="button" tabindex="0">
            <div class="card-icon"><i class="fas ${esc(info.icone)}"></i></div>
            <h3>${esc(info.titulo)}</h3>
            <p>${esc(info.descricao)}</p>
        </div>`;
    });

    html += `
    <div class="action-card card-gesthosp" onclick="window.app.abrirGestHosp()" role="button" tabindex="0">
        <div class="card-icon"><i class="fas fa-user-plus"></i></div>
        <h3>Cadastro GestHosp</h3>
        <p>Solicitar cadastro de profissional no sistema</p>
    </div>
    <div class="action-card card-meus-chamados" onclick="window.app.mostrarMeusChamados()" role="button" tabindex="0">
        <div class="card-icon"><i class="fas fa-clipboard-list"></i></div>
        <h3>Acompanhar Chamados</h3>
        <p>Veja o andamento dos chamados abertos hoje</p>
    </div>`;

    grid.innerHTML = html;
}

// ============================================================
// SELECTS
// ============================================================

function preencherSetores(lista) {
    const select = document.getElementById('setor');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o setor...</option>' +
        lista.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
}

function preencherEstados() {
    const select = document.getElementById('ghEstado');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione...</option>' +
        ESTADOS_BRASIL.map(e => `<option value="${e.sigla}">${esc(e.nome)}</option>`).join('');
}

// ============================================================
// CONTATOS DE SUPORTE
// ============================================================

function renderizarContatos(contatos) {
    const container = document.getElementById('contatosSuporte');
    if (!container) return;

    if (!contatos || !contatos.length) {
        container.innerHTML = '<span class="loading-text">Nenhum técnico disponível para contato no momento.</span>';
        return;
    }

    container.innerHTML = contatos.map(c => {
        const manut = c.departamento === 'MANUTENCAO';
        return `
        <a href="https://wa.me/55${esc(c.whatsapp)}" target="_blank" rel="noopener" class="contato-card">
            <div class="contato-avatar"><i class="fas ${manut ? 'fa-screwdriver-wrench' : 'fa-desktop'}"></i></div>
            <div style="flex:1;min-width:0;">
                <strong>${esc(c.nome)}</strong>
                <small>${esc(c.cargo || 'Técnico')}</small>
            </div>
            <span class="depto-tag depto-${manut ? 'manutencao' : 'ti'}">${manut ? 'MANUTENÇÃO' : 'TI'}</span>
        </a>`;
    }).join('');
}

// ============================================================
// LISTA DE CHAMADOS
// ============================================================

function statusClasse(status) {
    return 'status-' + String(status || 'A Fazer')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s/g, '');
}

function renderizarListaChamados(chamados) {
    const lista = document.getElementById('listaChamados');
    if (!lista) return;

    if (!chamados || !chamados.length) {
        lista.innerHTML = `
        <div class="vazio-estado">
            <div class="emoji"><i class="fas fa-inbox"></i></div>
            <h3>Nenhum chamado hoje</h3>
            <p>Os chamados abertos aparecerão aqui automaticamente.</p>
        </div>`;
        return;
    }

    const abertos = chamados.filter(c => c.status !== 'Concluído').length;

    lista.innerHTML = `
        <p style="font-size:11.5px;color:var(--text-2);margin-bottom:12px;">
            ${chamados.length} chamado(s) hoje · ${abertos} em aberto
        </p>` +
        chamados.map(c => {
            const data = c.data_abertura?.toDate ? c.data_abertura.toDate() : new Date();
            const manut = c.departamento === 'MANUTENCAO';
            const icone = c.tipo === 'gesthosp' ? 'fa-hospital-user' : manut ? 'fa-screwdriver-wrench' : 'fa-desktop';
            const thumb = (c.fotos && c.fotos.length)
                ? `<img class="chamado-card__thumb" src="${esc(c.fotos[0])}" alt="Foto do chamado" loading="lazy">`
                : '';

            return `
            <div class="chamado-card${c.status === 'Concluído' ? ' concluido' : ''}" onclick="window.app.verDetalhes('${esc(c.id)}')">
                ${thumb}
                <div style="flex:1;min-width:190px;">
                    <strong><i class="fas ${icone}" style="color:var(--blue);margin-right:6px;"></i>${esc(c.titulo || 'Sem título')}</strong>
                    <small>
                        ${esc(c.protocolo || '—')} &nbsp;·&nbsp;
                        ${esc(c.setor || '—')} &nbsp;·&nbsp;
                        ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} &nbsp;·&nbsp;
                        ${manut ? 'Manutenção' : esc(c.departamento || 'TI')}
                        ${c.fotos && c.fotos.length ? `&nbsp;·&nbsp;<i class="fas fa-camera"></i> ${c.fotos.length}` : ''}
                    </small>
                </div>
                <span class="status-badge ${statusClasse(c.status)}">${esc(c.status || 'A Fazer')}</span>
            </div>`;
        }).join('');
}

// ============================================================
// DETALHES DO CHAMADO
// ============================================================

function renderizarDetalhesChamado(chamado) {
    const conteudo = document.getElementById('detalhesConteudo');
    if (!conteudo) return;

    const data = chamado.data_abertura?.toDate ? chamado.data_abertura.toDate() : new Date();

    const timeline = (chamado.timeline || []).slice().reverse().map(t => {
        let quando = '—';
        try { quando = new Date(t.data).toLocaleString('pt-BR'); } catch (e) {}
        return `
        <div class="timeline-item">
            <strong>${esc(quando)}</strong>
            <p>${esc(t.acao || t.status || '')}</p>
        </div>`;
    }).join('');

    const fotos = (chamado.fotos || []).map(url =>
        `<img src="${esc(url)}" alt="Foto do chamado" loading="lazy" onclick="HH.lightbox('${esc(url)}')">`
    ).join('');

    const blocoFotos = fotos
        ? `<h4><i class="fas fa-camera"></i> Fotos anexadas</h4><div class="fotos-chamado">${fotos}</div>`
        : '';

    if (chamado.tipo === 'gesthosp') {
        conteudo.innerHTML = `
        <h3>Solicitação de cadastro — GestHosp</h3>
        <span class="status-badge ${statusClasse(chamado.status)}">${esc(chamado.status || '—')}</span>
        <div class="detalhe-grid">
            <div class="detalhe-item"><span>Protocolo</span><strong>${esc(chamado.protocolo || '—')}</strong></div>
            <div class="detalhe-item"><span>Aberto em</span><strong>${data.toLocaleString('pt-BR')}</strong></div>
        </div>
        <div class="lgpd-box">
            <i class="fas fa-lock"></i> Os dados pessoais desta solicitação ficam visíveis apenas para a equipe de TI, conforme a LGPD.
        </div>
        <hr>
        <h4>Andamento</h4>
        ${timeline || '<p style="color:var(--text-2);">Nenhum evento registrado.</p>'}`;
    } else {
        conteudo.innerHTML = `
        <h3>${esc(chamado.titulo || 'Sem título')}</h3>
        <span class="status-badge ${statusClasse(chamado.status)}">${esc(chamado.status || '—')}</span>
        <div class="detalhe-grid">
            <div class="detalhe-item"><span>Protocolo</span><strong>${esc(chamado.protocolo || '—')}</strong></div>
            <div class="detalhe-item"><span>Solicitante</span><strong>${esc(chamado.solicitante || '—')}</strong></div>
            <div class="detalhe-item"><span>Setor</span><strong>${esc(chamado.setor || '—')}</strong></div>
            <div class="detalhe-item"><span>Prioridade</span><strong>${esc(chamado.prioridade || '—')}</strong></div>
            <div class="detalhe-item"><span>Departamento</span><strong>${chamado.departamento === 'MANUTENCAO' ? 'Manutenção' : esc(chamado.departamento || 'TI')}</strong></div>
            <div class="detalhe-item"><span>Aberto em</span><strong>${data.toLocaleString('pt-BR')}</strong></div>
            ${chamado.tecnico ? `<div class="detalhe-item"><span>Técnico</span><strong>${esc(chamado.tecnico)}</strong></div>` : ''}
            ${chamado.executante ? `<div class="detalhe-item"><span>Executante</span><strong>${esc(chamado.executante)}</strong></div>` : ''}
        </div>
        ${chamado.descricao ? `<hr><h4>Descrição</h4><p style="white-space:pre-wrap;">${esc(chamado.descricao)}</p>` : ''}
        ${blocoFotos ? '<hr>' + blocoFotos : ''}
        <hr>
        <h4>Andamento</h4>
        ${timeline || '<p style="color:var(--text-2);">Nenhum evento registrado.</p>'}`;
    }

    document.getElementById('modalDetalhes').classList.add('ativo');
}

// ============================================================
// AUXILIARES DE INTERFACE
// ============================================================

function toggleSuporte() {
    const contatos = document.getElementById('contatosSuporte');
    const seta = document.getElementById('setaSuporte');
    if (contatos) contatos.classList.toggle('open');
    if (seta) seta.classList.toggle('open');
}

function fecharModal() {
    document.getElementById('modalDetalhes')?.classList.remove('ativo');
}

function toggleBotaoLoading(id, carregando, textoOriginal = '', textoCarregando = 'Enviando...') {
    const botao = document.getElementById(id);
    if (!botao) return;

    if (carregando) {
        botao.disabled = true;
        if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.innerHTML;
        botao.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${esc(textoCarregando)}`;
    } else {
        botao.disabled = false;
        botao.innerHTML = textoOriginal || botao.dataset.textoOriginal || botao.innerHTML;
    }
}
