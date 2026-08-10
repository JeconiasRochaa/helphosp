// ============================================
// FORMULÁRIOS DO PORTAL
// ============================================

/**
 * Abre formulário de chamado
 */
function abrirFormulario(departamento) {
    window.departamentoSelecionado = departamento;
    
    document.getElementById('formChamado').classList.add('active');
    document.getElementById('formGestHosp').classList.remove('active');
    document.getElementById('chamadosContainer').classList.remove('active');
    
    // Título
    const titulos = {
        TI: '🖥️ Chamado - TI',
        MANUTENCAO: '🔧 Chamado - Manutenção'
    };
    document.getElementById('formTitle').textContent = titulos[departamento] || `📋 Chamado - ${departamento}`;
    document.getElementById('departamento').value = departamento;
    
    // Indicador
    const indicador = document.getElementById('deptoIndicator');
    const indicadorTexto = document.getElementById('deptoIndicatorText');
    indicador.style.display = 'flex';
    
    if (departamento === 'TI') {
        indicador.className = 'depto-indicator ti';
        indicadorTexto.textContent = '🖥️ Enviado para TECNOLOGIA DA INFORMAÇÃO';
    } else if (departamento === 'MANUTENCAO') {
        indicador.className = 'depto-indicator manutencao';
        indicadorTexto.textContent = '🔧 Enviado para MANUTENÇÃO';
    } else {
        indicador.className = 'depto-indicator ti';
        indicadorTexto.textContent = `📋 Enviado para ${departamento}`;
    }
    
    // Categorias
    const categorias = CATEGORIAS_PADRAO[departamento] || ['Problema geral', 'Solicitação', 'Dúvida', 'Outros'];
    const selectCategoria = document.getElementById('categoria');
    selectCategoria.innerHTML = '<option value="">Selecione...</option>';
    categorias.forEach(cat => {
        selectCategoria.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    
    limparFormularioChamado();
    document.getElementById('formChamado').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Abre formulário GestHosp
 */
function abrirGestHosp() {
    document.getElementById('formGestHosp').classList.add('active');
    document.getElementById('formChamado').classList.remove('active');
    document.getElementById('chamadosContainer').classList.remove('active');
    document.getElementById('formGestHosp').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Fecha todos formulários
 */
function fecharTudo() {
    document.getElementById('formChamado').classList.remove('active');
    document.getElementById('formGestHosp').classList.remove('active');
    document.getElementById('chamadosContainer').classList.remove('active');
}

/**
 * Limpa formulário
 */
function limparFormularioChamado() {
    const campos = ['solicitante', 'contato', 'titulo', 'descricao'];
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
    });
    
    const setor = document.getElementById('setor');
    if (setor) setor.value = '';
    
    const prioridade = document.getElementById('prioridade');
    if (prioridade) prioridade.value = 'Média';
    
    const categoria = document.getElementById('categoria');
    if (categoria) categoria.value = '';
}

/**
 * Prioridade por categoria
 */
function getPrioridadePorCategoria(categoria) {
    return PRIORIDADE_POR_CATEGORIA[categoria] || 'Média';
}

/**
 * Atualiza prioridade
 */
function atualizarPrioridadeAuto() {
    const categoria = document.getElementById('categoria')?.value || '';
    const campoPrioridade = document.getElementById('prioridade');
    if (campoPrioridade) {
        campoPrioridade.value = getPrioridadePorCategoria(categoria);
    }
}

/**
 * Cria chamado
 */
async function criarChamado() {
    const departamento = document.getElementById('departamento').value || window.departamentoSelecionado;
    const categoria = document.getElementById('categoria').value;
    const titulo = document.getElementById('titulo').value.trim();
    const solicitante = document.getElementById('solicitante').value.trim();
    const setor = document.getElementById('setor').value;
    
    if (!departamento || !categoria || !titulo || !solicitante || !setor) {
        mostrarToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    const prioridade = getPrioridadePorCategoria(categoria);
    document.getElementById('prioridade').value = prioridade;
    
    toggleBotaoLoading('btnSubmitChamado', true);
    
    try {
        const chamado = {
            departamento,
            tipo: 'chamado',
            titulo,
            descricao: document.getElementById('descricao').value.trim(),
            solicitante,
            contato: document.getElementById('contato').value.trim(),
            setor,
            categoria,
            prioridade
        };
        
        const protocolo = await criarChamadoFirestore(chamado);
        mostrarToast(`✅ Chamado enviado! Protocolo: ${protocolo}`, 'success');
        
        limparFormularioChamado();
        document.getElementById('departamento').value = departamento;
        fecharTudo();
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro ao criar chamado. Tente novamente.', 'error');
    } finally {
        toggleBotaoLoading('btnSubmitChamado', false, '<i class="fas fa-paper-plane"></i> Enviar Chamado');
    }
}

/**
 * Cria solicitação GestHosp
 */
async function criarGestHosp() {
    const nome = document.getElementById('ghNome').value.trim();
    const cpf = document.getElementById('ghCpf').value.trim();
    const email = document.getElementById('ghEmail').value.trim();
    const telefone = document.getElementById('ghTel').value.trim();
    const profissao = document.getElementById('ghProfissao').value.trim();
    const cidade = document.getElementById('ghCidade').value.trim();
    const estado = document.getElementById('ghEstado').value;
    
    if (!nome || !cpf || !email || !telefone || !profissao || !cidade || !estado) {
        mostrarToast('Preencha todos os campos obrigatórios (*)', 'warning');
        return;
    }
    
    toggleBotaoLoading('btnSubmitGestHosp', true);
    
    try {
        const dadosPessoais = {
            nome, cpf,
            rg: document.getElementById('ghRG').value.trim(),
            dataNascimento: document.getElementById('ghDataNasc').value,
            email, telefone,
            cep: document.getElementById('ghCEP').value.trim(),
            logradouro: document.getElementById('ghLogradouro').value.trim(),
            numero: document.getElementById('ghNumero').value.trim(),
            complemento: document.getElementById('ghComplemento').value.trim(),
            bairro: document.getElementById('ghBairro').value.trim(),
            cidade, estado,
            pais: document.getElementById('ghPais').value || 'Brasil',
            profissao,
            numConselho: document.getElementById('ghNumConselho').value.trim(),
            observacoes: document.getElementById('ghObs').value.trim()
        };
        
        const chamado = {
            departamento: 'TI',
            tipo: 'gesthosp',
            titulo: `Cadastro GestHosp - ${dadosPessoais.nome}`,
            descricao: JSON.stringify(dadosPessoais),
            solicitante: dadosPessoais.nome || 'Portal',
            setor: 'GestHosp',
            categoria: 'Cadastro',
            prioridade: 'Média'
        };
        
        const protocolo = await criarChamadoFirestore(chamado);
        mostrarToast(`✅ Solicitação enviada! Protocolo: ${protocolo}`, 'success');
        
        document.getElementById('gestHospForm').reset();
        fecharTudo();
    } catch (error) {
        console.error('Erro:', error);
        mostrarToast('Erro ao enviar solicitação', 'error');
    } finally {
        toggleBotaoLoading('btnSubmitGestHosp', false, '<i class="fas fa-user-plus"></i> Solicitar Cadastro');
    }
}

/**
 * Busca CEP
 */
async function buscarCEP() {
    const cepInput = document.getElementById('ghCEP');
    if (!cepInput) return;
    
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await response.json();
        
        if (!dados.erro) {
            document.getElementById('ghLogradouro').value = dados.logradouro || '';
            document.getElementById('ghBairro').value = dados.bairro || '';
            document.getElementById('ghCidade').value = dados.localidade || '';
            document.getElementById('ghComplemento').value = dados.complemento || '';
            
            const selectEstado = document.getElementById('ghEstado');
            if (dados.uf && selectEstado) {
                for (let i = 0; i < selectEstado.options.length; i++) {
                    if (selectEstado.options[i].value === dados.uf) {
                        selectEstado.selectedIndex = i;
                        break;
                    }
                }
            }
            
            document.getElementById('ghNumero').focus();
            mostrarToast('✅ CEP encontrado!', 'success');
        } else {
            mostrarToast('⚠️ CEP não encontrado', 'warning');
        }
    } catch (error) {
        console.error('Erro CEP:', error);
        mostrarToast('⚠️ Erro ao buscar CEP', 'warning');
    }
}