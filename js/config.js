// ============================================
// CONFIGURAÇÕES DO PORTAL PÚBLICO
// ============================================

// Estados brasileiros
const ESTADOS_BRASIL = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
];

// Categorias de chamados por departamento
const CATEGORIAS_PADRAO = {
    TI: [
        'Computador não liga',
        'Computador lento/travando',
        'Monitor com defeito',
        'Teclado/Mouse quebrado',
        'Impressora não funciona',
        'Impressora sem toner',
        'Sistema fora do ar',
        'Sistema com erro',
        'Rede fora do ar',
        'Internet lenta',
        'Wi-Fi não conecta',
        'Senha bloqueada',
        'Acesso ao sistema',
        'Telefone com defeito',
        'Instalação de software',
        'Cabo de rede danificado',
        'Outros - TI'
    ],
    MANUTENCAO: [
        'Problema elétrico',
        'Tomada quebrada',
        'Lâmpada queimada',
        'Disjuntor desarmando',
        'Vazamento de água',
        'Torneira pingando',
        'Descarga com problema',
        'Pia entupida',
        'Ar-condicionado não gela',
        'Ar-condicionado pingando',
        'Pintura danificada',
        'Parede com infiltração',
        'Móvel quebrado',
        'Porta com problema',
        'Janela quebrada',
        'Telhado com goteira',
        'Piso danificado',
        'Fechadura com defeito',
        'Gases medicinais',
        'Temperatura do ar-condicionado',
        'Vaso sanitário entupido',
        'Cilíndro de oxigênio',
        'Vácuo',
        'Fluxômetro',
        'Outros - Manutenção'
    ]
};

// Prioridade por categoria
const PRIORIDADE_POR_CATEGORIA = {
    // TI - Crítica
    'Sistema fora do ar': 'Crítica',
    'Rede fora do ar': 'Crítica',
    
    // TI - Alta
    'Computador não liga': 'Alta',
    'Impressora não funciona': 'Alta',
    'Sistema com erro': 'Alta',
    'Telefone com defeito': 'Alta',
    'Cabo de rede danificado': 'Alta',
    
    // TI - Média
    'Computador lento/travando': 'Média',
    'Monitor com defeito': 'Média',
    'Teclado/Mouse quebrado': 'Média',
    'Internet lenta': 'Média',
    'Wi-Fi não conecta': 'Média',
    'Senha bloqueada': 'Média',
    'Acesso ao sistema': 'Média',
    'Outros - TI': 'Média',
    
    // TI - Baixa
    'Impressora sem toner': 'Baixa',
    'Instalação de software': 'Baixa',
    
    // MANUTENÇÃO - Crítica
    'Gases medicinais': 'Crítica',
    'Problema elétrico': 'Crítica',
    'Disjuntor desarmando': 'Crítica',
    
    // MANUTENÇÃO - Alta
    'Vazamento de água': 'Alta',
    'Tomada quebrada': 'Alta',
    'Ar-condicionado não gela': 'Alta',
    'Ar-condicionado pingando': 'Alta',
    'Piso danificado': 'Alta',
    'Fechadura com defeito': 'Alta',
    'Telhado com goteira': 'Alta',
    'Fluxômetro': 'Alta',
    'Vácuo': 'Alta',
    'Cilíndro de oxigênio': 'Alta',
    
    // MANUTENÇÃO - Média
    'Pia entupida': 'Média',
    'Porta com problema': 'Média',
    'Janela quebrada': 'Média',
    'Parede com infiltração': 'Média',
    'Móvel quebrado': 'Média',
    'Descarga com problema': 'Média',
    'Vaso sanitário entupido': 'Média',
    'Outros - Manutenção': 'Média',
    
    // MANUTENÇÃO - Baixa
    'Lâmpada queimada': 'Baixa',
    'Torneira pingando': 'Baixa',
    'Pintura danificada': 'Baixa',
    'Temperatura do ar-condicionado': 'Baixa'
};

// Informações dos departamentos
const DEPARTAMENTO_INFO = {
    TI: {
        icone: 'fa-desktop',
        titulo: '🖥️ Tecnologia da Informação',
        descricao: 'Computadores, sistemas, rede, internet, e-mail, senhas'
    },
    MANUTENCAO: {
        icone: 'fa-tools',
        titulo: '🔧 Manutenção',
        descricao: 'Elétrica, hidráulica, ar-condicionado, estrutura, pintura'
    }
};

// Cores dos cards
const CORES_DEPARTAMENTO = ['dep-0', 'dep-1', 'dep-2', 'dep-3', 'dep-4', 'dep-5', 'dep-6', 'dep-7'];

// Setores padrão (fallback)
const SETORES_PADRAO = [
    'Almoxarifado',
    'CAF Principal',
    'CAF CR',
    'Centro Cirúrgico',
    'Clínica Cirurgica',
    'Clínica Médica I',
    'Clínica Médica II',
    'Comunicação',
    'Direção Administrativa',
    'Direção Enfermagem',
    'Direção geral',
    'Direção Medica',
    'Emergência/Vermelha',
    'Engenharia Clinica',
    'Farmácia',
    'Faturamento',
    'Fisioterapia',
    'Hotelaria',
    'Juridico',
    'Laboratório',
    'Manutenção',
    'NIR',
    'Nutrição',
    'Oncologia I',
    'Oncologia II',
    'Outros',
    'Ouvidoria',
    'Patrimonio',
    'Pediatria',
    'Psicologia',
    'RH',
    'Raio-X',
    'Recepção CR',
    'Recepção Geral',
    'Recepção Nefrologia',
    'Same',
    'Serviço Social',
    'Sesmt',
    'Telemedicina',
    'Tomografia',
    'UTI I',
    'UTI II'
];