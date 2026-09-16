// ============================================================
// INICIALIZAÇÃO DO PORTAL PÚBLICO
// ============================================================

window.app = {
    toggleSuporte,
    fecharTudo,
    fecharModal,
    abrirFormulario,
    abrirGestHosp,
    mostrarMeusChamados,
    verDetalhes
};

window.departamentoSelecionado = '';

// ============================================================
// EVENTOS
// ============================================================

function setupEventListeners() {
    // Envio do chamado
    document.getElementById('btnSubmitChamado')?.addEventListener('click', e => {
        e.preventDefault();
        criarChamado();
    });

    // Envio GestHosp
    document.getElementById('btnSubmitGestHosp')?.addEventListener('click', e => {
        e.preventDefault();
        criarGestHosp();
    });

    // Prioridade automática pela categoria
    document.getElementById('categoria')?.addEventListener('change', atualizarPrioridadeAuto);

    // ---------- Anexo de fotos ----------
    const drop = document.getElementById('fotoDrop');
    const input = document.getElementById('fotoInput');

    if (drop && input) {
        drop.addEventListener('click', () => input.click());
        drop.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
        });
        input.addEventListener('change', () => adicionarFotos(input.files));

        ['dragenter', 'dragover'].forEach(ev =>
            drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
        ['dragleave', 'drop'].forEach(ev =>
            drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
        drop.addEventListener('drop', e => {
            if (e.dataTransfer?.files?.length) adicionarFotos(e.dataTransfer.files);
        });
    }

    // Colar imagem da área de transferência (print de erro, por exemplo)
    document.addEventListener('paste', e => {
        if (!document.getElementById('formChamado')?.classList.contains('active')) return;
        const itens = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith('image/'));
        if (!itens.length) return;
        adicionarFotos(itens.map(i => i.getAsFile()).filter(Boolean));
    });

    // ---------- Máscaras ----------
    document.getElementById('ghCpf')?.addEventListener('input', e => mascaraCPF(e.target));
    document.getElementById('ghTel')?.addEventListener('input', e => mascaraTelefone(e.target));
    document.getElementById('contato')?.addEventListener('input', e => {
        if (/^[\d\s()\-+]*$/.test(e.target.value) && e.target.value.replace(/\D/g, '').length > 6) {
            mascaraTelefone(e.target);
        }
    });

    const cep = document.getElementById('ghCEP');
    if (cep) {
        cep.addEventListener('input', e => mascaraCEP(e.target));
        cep.addEventListener('blur', buscarCEP);
    }

    // ---------- Modal ----------
    const modal = document.getElementById('modalDetalhes');
    modal?.addEventListener('click', e => { if (e.target === modal) fecharModal(); });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (document.querySelector('.hh-lightbox') || document.querySelector('.hh-dialog-backdrop')) return;
        if (modal?.classList.contains('ativo')) { fecharModal(); return; }
        fecharTudo();
    });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function inicializarPortal() {
    console.log('HelpHosp Portal v3.0 — iniciando');

    preencherEstados();
    setupEventListeners();

    try {
        const [departamentos, setoresData, contatos] = await Promise.all([
            carregarDepartamentos(),
            carregarSetores(),
            carregarContatosSuporte()
        ]);

        departamentosChamados = departamentos;
        setores = setoresData;

        renderizarActionGrid(departamentos);
        preencherSetores(setoresData);
        renderizarContatos(contatos);

        console.log('Portal pronto.');
    } catch (error) {
        console.error('Erro na inicialização:', error);

        // Modo degradado: o usuário ainda consegue abrir chamados
        renderizarActionGrid(['TI', 'MANUTENCAO']);
        preencherSetores(SETORES_PADRAO);

        const box = document.getElementById('contatosSuporte');
        if (box) box.innerHTML = '<span class="loading-text">Não foi possível carregar os contatos.</span>';

        HH.aviso('Conexão instável. Alguns dados podem estar desatualizados.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarPortal);
} else {
    inicializarPortal();
}
