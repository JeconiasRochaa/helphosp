// ============================================
// MEUS CHAMADOS - PORTAL
// ============================================

/**
 * Mostra chamados do dia
 */
async function mostrarMeusChamados() {
    document.getElementById('chamadosContainer').classList.add('active');
    document.getElementById('formChamado').classList.remove('active');
    document.getElementById('formGestHosp').classList.remove('active');
    document.getElementById('chamadosContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const lista = document.getElementById('listaChamados');
    lista.innerHTML = '<div class="spinner"></div><p style="text-align:center;color:var(--gray);">Carregando...</p>';
    
    try {
        const chamados = await buscarChamadosHoje();
        renderizarListaChamados(chamados);
    } catch (error) {
        lista.innerHTML = '<p style="text-align:center;color:var(--gray);">Erro ao carregar chamados</p>';
    }
}

/**
 * Ver detalhes do chamado
 */
async function verDetalhes(id) {
    try {
        const chamado = await buscarDetalhesChamado(id);
        if (chamado) {
            renderizarDetalhesChamado(chamado);
        } else {
            mostrarToast('Chamado não encontrado', 'error');
        }
    } catch (error) {
        mostrarToast('Erro ao carregar detalhes', 'error');
    }
}