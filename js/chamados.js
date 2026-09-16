// ============================================================
// ACOMPANHAMENTO DE CHAMADOS — PORTAL
// ============================================================

let listenerChamados = null;

/**
 * Mostra os chamados do dia em tempo real.
 */
async function mostrarMeusChamados() {
    document.getElementById('chamadosContainer').classList.add('active');
    document.getElementById('formChamado').classList.remove('active');
    document.getElementById('formGestHosp').classList.remove('active');
    document.getElementById('chamadosContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

    const lista = document.getElementById('listaChamados');
    lista.innerHTML = '<div style="padding:34px 0;text-align:center;"><div class="spinner"></div><p style="margin-top:12px;color:var(--text-2);font-size:12px;">Carregando chamados...</p></div>';

    try {
        const chamados = await buscarChamadosHoje();
        renderizarListaChamados(chamados);
        iniciarEscutaChamados();
    } catch (error) {
        console.error(error);
        lista.innerHTML = `
        <div class="vazio-estado">
            <div class="emoji"><i class="fas fa-triangle-exclamation" style="color:var(--warning);"></i></div>
            <h3>Não foi possível carregar</h3>
            <p>Verifique sua conexão e tente novamente.</p>
            <button class="btn-submit" style="max-width:220px;margin:16px auto 0;" onclick="window.app.mostrarMeusChamados()">
                <i class="fas fa-rotate"></i> Tentar de novo
            </button>
        </div>`;
    }
}

/**
 * Atualização em tempo real enquanto o painel está aberto.
 */
function iniciarEscutaChamados() {
    if (listenerChamados) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    try {
        listenerChamados = db.collection('chamados')
            .where('data_abertura', '>=', firebase.firestore.Timestamp.fromDate(hoje))
            .orderBy('data_abertura', 'desc')
            .limit(80)
            .onSnapshot(snap => {
                if (!document.getElementById('chamadosContainer')?.classList.contains('active')) return;

                const lista = [];
                snap.forEach(doc => {
                    const c = doc.data();
                    c.id = doc.id;
                    lista.push(c);
                });
                lista.sort((a, b) => (a.status === 'Concluído' ? 1 : 0) - (b.status === 'Concluído' ? 1 : 0));
                renderizarListaChamados(lista);
            }, erro => console.error('Escuta de chamados:', erro));
    } catch (e) {
        console.error(e);
    }
}

/**
 * Abre o modal com os detalhes.
 */
async function verDetalhes(id) {
    try {
        const chamado = await buscarDetalhesChamado(id);
        if (chamado) {
            renderizarDetalhesChamado(chamado);
        } else {
            HH.erro('Chamado não encontrado.');
        }
    } catch (error) {
        console.error(error);
        HH.erro('Não foi possível carregar os detalhes.');
    }
}
