// ============================================================
// FORMULÁRIOS DO PORTAL
// ============================================================

const MAX_FOTOS = 3;
let fotosSelecionadas = []; // { blob, dataUrl, width, height, nome }

// ============================================================
// NAVEGAÇÃO ENTRE PAINÉIS
// ============================================================

function abrirFormulario(departamento) {
    window.departamentoSelecionado = departamento;

    document.getElementById('formChamado').classList.add('active');
    document.getElementById('formGestHosp').classList.remove('active');
    document.getElementById('chamadosContainer').classList.remove('active');

    const titulos = {
        TI: 'Chamado — Tecnologia da Informação',
        MANUTENCAO: 'Chamado — Manutenção'
    };
    document.getElementById('formTitle').textContent = titulos[departamento] || `Chamado — ${departamento}`;
    document.getElementById('departamento').value = departamento;

    const indicador = document.getElementById('deptoIndicator');
    const texto = document.getElementById('deptoIndicatorText');
    indicador.style.display = 'flex';

    if (departamento === 'MANUTENCAO') {
        indicador.className = 'depto-indicator manutencao';
        texto.textContent = 'Será encaminhado para a equipe de MANUTENÇÃO';
    } else if (departamento === 'TI') {
        indicador.className = 'depto-indicator ti';
        texto.textContent = 'Será encaminhado para a equipe de TECNOLOGIA DA INFORMAÇÃO';
    } else {
        indicador.className = 'depto-indicator ti';
        texto.textContent = `Será encaminhado para ${departamento}`;
    }

    // Categorias do departamento
    const categorias = CATEGORIAS_PADRAO[departamento] || ['Problema geral', 'Solicitação', 'Dúvida', 'Outros'];
    const select = document.getElementById('categoria');
    select.innerHTML = '<option value="">Selecione...</option>' +
        categorias.map(cat => `<option value="${HH.esc(cat)}">${HH.esc(cat)}</option>`).join('');

    limparFormularioChamado();
    document.getElementById('departamento').value = departamento;
    document.getElementById('formChamado').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function abrirGestHosp() {
    document.getElementById('formGestHosp').classList.add('active');
    document.getElementById('formChamado').classList.remove('active');
    document.getElementById('chamadosContainer').classList.remove('active');
    document.getElementById('formGestHosp').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharTudo() {
    document.getElementById('formChamado').classList.remove('active');
    document.getElementById('formGestHosp').classList.remove('active');
    document.getElementById('chamadosContainer').classList.remove('active');
}

function limparFormularioChamado() {
    ['solicitante', 'contato', 'titulo', 'descricao'].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
    });
    const setor = document.getElementById('setor');
    if (setor) setor.value = '';
    const categoria = document.getElementById('categoria');
    if (categoria) categoria.value = '';
    const prioridade = document.getElementById('prioridade');
    if (prioridade) prioridade.value = 'Média';

    limparFotos();
}

// ============================================================
// PRIORIDADE AUTOMÁTICA
// ============================================================

function getPrioridadePorCategoria(categoria) {
    return PRIORIDADE_POR_CATEGORIA[categoria] || 'Média';
}

function atualizarPrioridadeAuto() {
    const categoria = document.getElementById('categoria')?.value || '';
    const campo = document.getElementById('prioridade');
    if (campo) campo.value = getPrioridadePorCategoria(categoria);
}

// ============================================================
// FOTOS
// ============================================================

function limparFotos() {
    fotosSelecionadas = [];
    const grid = document.getElementById('fotoPreview');
    if (grid) grid.innerHTML = '';
    const input = document.getElementById('fotoInput');
    if (input) input.value = '';
    atualizarProgresso(0, false);
}

function atualizarProgresso(pct, visivel) {
    const box = document.getElementById('uploadProgress');
    const bar = document.getElementById('uploadProgressBar');
    if (!box || !bar) return;
    box.classList.toggle('show', !!visivel);
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function renderizarPreviewFotos() {
    const grid = document.getElementById('fotoPreview');
    if (!grid) return;

    grid.innerHTML = fotosSelecionadas.map((f, i) => `
        <div class="foto-thumb">
            <img src="${f.dataUrl}" alt="Foto ${i + 1}">
            <button type="button" class="foto-thumb__del" onclick="removerFoto(${i})" aria-label="Remover foto">&times;</button>
            <div class="foto-thumb__size">${(f.blob.size / 1024).toFixed(0)} KB</div>
        </div>`).join('');
}

function removerFoto(indice) {
    fotosSelecionadas.splice(indice, 1);
    renderizarPreviewFotos();
}

async function adicionarFotos(fileList) {
    const arquivos = Array.from(fileList || []);
    if (!arquivos.length) return;

    if (!storage) {
        HH.aviso('O anexo de fotos está indisponível neste momento. Você ainda pode abrir o chamado descrevendo o problema.');
        return;
    }

    for (const file of arquivos) {
        if (fotosSelecionadas.length >= MAX_FOTOS) {
            HH.aviso(`Limite de ${MAX_FOTOS} fotos por chamado.`);
            break;
        }
        if (!file.type.startsWith('image/')) {
            HH.aviso(`"${file.name}" não é uma imagem.`);
            continue;
        }
        if (file.size > 8 * 1024 * 1024) {
            HH.aviso(`"${file.name}" passa de 8 MB.`);
            continue;
        }

        try {
            const comprimida = await comprimirImagem(file);
            comprimida.nome = file.name;
            fotosSelecionadas.push(comprimida);
        } catch (e) {
            HH.erro(`Não foi possível processar "${file.name}".`);
        }
    }

    renderizarPreviewFotos();
    const input = document.getElementById('fotoInput');
    if (input) input.value = '';
}

// ============================================================
// CRIAR CHAMADO
// ============================================================

async function criarChamado() {
    const departamento = document.getElementById('departamento').value || window.departamentoSelecionado;
    const categoria = document.getElementById('categoria').value;
    const titulo = document.getElementById('titulo').value.trim();
    const solicitante = document.getElementById('solicitante').value.trim();
    const setor = document.getElementById('setor').value;

    const faltando = [];
    if (!solicitante) faltando.push('seu nome');
    if (!setor) faltando.push('setor');
    if (!categoria) faltando.push('tipo de problema');
    if (!titulo) faltando.push('título');

    if (!departamento) {
        HH.aviso('Selecione o departamento antes de enviar.');
        return;
    }
    if (faltando.length) {
        HH.aviso('Preencha: ' + faltando.join(', ') + '.');
        return;
    }
    if (titulo.length < 4) {
        HH.aviso('Descreva o título com um pouco mais de detalhe.');
        return;
    }

    const prioridade = getPrioridadePorCategoria(categoria);
    document.getElementById('prioridade').value = prioridade;

    toggleBotaoLoading('btnSubmitChamado', true, '', fotosSelecionadas.length ? 'Enviando fotos...' : 'Enviando...');
    if (fotosSelecionadas.length) atualizarProgresso(2, true);

    try {
        const resultado = await criarChamadoFirestore({
            departamento,
            tipo: 'chamado',
            titulo,
            descricao: document.getElementById('descricao').value.trim(),
            solicitante,
            contato: document.getElementById('contato').value.trim(),
            setor,
            categoria,
            prioridade
        }, fotosSelecionadas, pct => atualizarProgresso(pct, true));

        HH.toast({
            titulo: 'Chamado registrado',
            mensagem: `Protocolo ${resultado.protocolo} · prioridade ${prioridade}` +
                      (resultado.fotos.length ? ` · ${resultado.fotos.length} foto(s) anexada(s)` : ''),
            tipo: 'success',
            duracao: 9000
        });

        limparFormularioChamado();
        document.getElementById('departamento').value = departamento;
        fecharTudo();
    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        HH.erro('Não conseguimos registrar o chamado. Verifique sua conexão e tente novamente.');
    } finally {
        atualizarProgresso(0, false);
        toggleBotaoLoading('btnSubmitChamado', false, '<i class="fas fa-paper-plane"></i> Enviar Chamado');
    }
}

// ============================================================
// GESTHOSP
// ============================================================

async function criarGestHosp() {
    const v = id => (document.getElementById(id)?.value || '').trim();

    const nome = v('ghNome');
    const cpf = v('ghCpf');
    const email = v('ghEmail');
    const telefone = v('ghTel');
    const profissao = v('ghProfissao');
    const cidade = v('ghCidade');
    const estado = v('ghEstado');

    if (!nome || !cpf || !email || !telefone || !profissao || !cidade || !estado) {
        HH.aviso('Preencha todos os campos marcados com asterisco (*).');
        return;
    }
    if (!validarCPF(cpf)) {
        HH.aviso('O CPF informado não é válido. Confira os números.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        HH.aviso('Informe um e-mail válido.');
        return;
    }

    toggleBotaoLoading('btnSubmitGestHosp', true);

    try {
        const dadosPessoais = {
            nome, cpf,
            rg: v('ghRG'),
            dataNascimento: v('ghDataNasc'),
            email, telefone,
            cep: v('ghCEP'),
            logradouro: v('ghLogradouro'),
            numero: v('ghNumero'),
            complemento: v('ghComplemento'),
            bairro: v('ghBairro'),
            cidade, estado,
            pais: v('ghPais') || 'Brasil',
            profissao,
            numConselho: v('ghNumConselho'),
            observacoes: v('ghObs')
        };

        const resultado = await criarChamadoFirestore({
            departamento: 'TI',
            tipo: 'gesthosp',
            titulo: `Cadastro GestHosp — ${nome}`,
            descricao: JSON.stringify(dadosPessoais),
            solicitante: nome,
            contato: telefone,
            setor: 'GestHosp',
            categoria: 'Cadastro de profissional',
            prioridade: 'Média'
        });

        HH.toast({
            titulo: 'Solicitação enviada',
            mensagem: `Protocolo ${resultado.protocolo}. A equipe de TI dará andamento ao cadastro.`,
            tipo: 'success',
            duracao: 9000
        });

        document.getElementById('gestHospForm').reset();
        document.getElementById('ghPais').value = 'Brasil';
        fecharTudo();
    } catch (error) {
        console.error('Erro GestHosp:', error);
        HH.erro('Não foi possível enviar a solicitação. Tente novamente.');
    } finally {
        toggleBotaoLoading('btnSubmitGestHosp', false, '<i class="fas fa-user-plus"></i> Solicitar Cadastro');
    }
}

// ============================================================
// VALIDAÇÕES E MÁSCARAS
// ============================================================

function validarCPF(valor) {
    const cpf = String(valor).replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
    let d1 = (soma * 10) % 11;
    if (d1 === 10) d1 = 0;
    if (d1 !== parseInt(cpf[9], 10)) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
    let d2 = (soma * 10) % 11;
    if (d2 === 10) d2 = 0;
    return d2 === parseInt(cpf[10], 10);
}

function mascaraCPF(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    el.value = v;
}

function mascaraTelefone(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    el.value = v.trim();
}

function mascaraCEP(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    el.value = v;
}

// ============================================================
// BUSCA DE CEP
// ============================================================

async function buscarCEP() {
    const input = document.getElementById('ghCEP');
    if (!input) return;

    const cep = input.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await resposta.json();

        if (dados.erro) {
            HH.aviso('CEP não encontrado.');
            return;
        }

        const set = (id, valor) => { const el = document.getElementById(id); if (el && valor) el.value = valor; };
        set('ghLogradouro', dados.logradouro);
        set('ghBairro', dados.bairro);
        set('ghCidade', dados.localidade);
        set('ghComplemento', dados.complemento);

        const selectEstado = document.getElementById('ghEstado');
        if (dados.uf && selectEstado) selectEstado.value = dados.uf;

        document.getElementById('ghNumero')?.focus();
        HH.sucesso('Endereço preenchido automaticamente.', { som: false });
    } catch (error) {
        console.error('Erro CEP:', error);
        HH.aviso('Não foi possível consultar o CEP agora.');
    }
}
