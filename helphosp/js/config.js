// ============================================================
// CONFIGURAÇÕES DO PORTAL PÚBLICO
// ============================================================

const ESTADOS_BRASIL = [
    { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' }, { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' }, { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' }, { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' }, { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
];

// ============================================================
// CATÁLOGO ÚNICO DE CATEGORIAS
// Fonte de verdade: cada categoria já carrega sua prioridade,
// evitando divergência entre a lista exibida e o mapa de SLA.
// ============================================================

const CATALOGO_CATEGORIAS = {
    TI: [
        { nome: 'Sistema fora do ar',            prioridade: 'Crítica' },
        { nome: 'Rede fora do ar',               prioridade: 'Crítica' },
        { nome: 'Servidor inacessível',          prioridade: 'Crítica' },
        { nome: 'Computador não liga',           prioridade: 'Alta' },
        { nome: 'Sistema com erro',              prioridade: 'Alta' },
        { nome: 'Impressora não funciona',       prioridade: 'Alta' },
        { nome: 'Cabo de rede danificado',       prioridade: 'Alta' },
        { nome: 'Ramal sem funcionar',           prioridade: 'Alta' },
        { nome: 'Computador sem internet',       prioridade: 'Alta' },
        { nome: 'Computador lento/travando',     prioridade: 'Média' },
        { nome: 'Monitor não liga',              prioridade: 'Média' },
        { nome: 'Teclado/Mouse quebrado',        prioridade: 'Média' },
        { nome: 'Internet lenta',                prioridade: 'Média' },
        { nome: 'Wi-Fi não conecta',             prioridade: 'Média' },
        { nome: 'Senha bloqueada',               prioridade: 'Média' },
        { nome: 'Acesso ao sistema',             prioridade: 'Média' },
        { nome: 'Impressora sem toner',          prioridade: 'Baixa' },
        { nome: 'Instalação de programas',       prioridade: 'Baixa' },
        { nome: 'Outros - TI',                   prioridade: 'Média' }
    ],
    MANUTENCAO: [
        { nome: 'Gases medicinais',              prioridade: 'Crítica' },
        { nome: 'Problema elétrico',             prioridade: 'Crítica' },
        { nome: 'Disjuntor desarmando',          prioridade: 'Crítica' },
        { nome: 'Cilindro de oxigênio',          prioridade: 'Crítica' },
        { nome: 'Vazamento de água',             prioridade: 'Alta' },
        { nome: 'Tomada quebrada',               prioridade: 'Alta' },
        { nome: 'Ar-condicionado não gela',      prioridade: 'Alta' },
        { nome: 'Ar-condicionado pingando',      prioridade: 'Alta' },
        { nome: 'Telhado com goteira',           prioridade: 'Alta' },
        { nome: 'Fechadura com defeito',         prioridade: 'Alta' },
        { nome: 'Piso danificado',               prioridade: 'Alta' },
        { nome: 'Fluxômetro',                    prioridade: 'Alta' },
        { nome: 'Vácuo',                         prioridade: 'Alta' },
        { nome: 'Pia entupida',                  prioridade: 'Média' },
        { nome: 'Vaso sanitário entupido',       prioridade: 'Média' },
        { nome: 'Descarga com problema',         prioridade: 'Média' },
        { nome: 'Porta com problema',            prioridade: 'Média' },
        { nome: 'Janela quebrada',               prioridade: 'Média' },
        { nome: 'Parede com infiltração',        prioridade: 'Média' },
        { nome: 'Móvel quebrado',                prioridade: 'Média' },
        { nome: 'Lâmpada queimada',              prioridade: 'Baixa' },
        { nome: 'Torneira pingando',             prioridade: 'Baixa' },
        { nome: 'Pintura danificada',            prioridade: 'Baixa' },
        { nome: 'Temperatura do ar-condicionado',prioridade: 'Baixa' },
        { nome: 'Outros - Manutenção',           prioridade: 'Média' }
    ]
};

// Listas derivadas (mantêm a compatibilidade com o restante do sistema)
const CATEGORIAS_PADRAO = Object.keys(CATALOGO_CATEGORIAS).reduce((acc, dep) => {
    acc[dep] = CATALOGO_CATEGORIAS[dep].map(c => c.nome);
    return acc;
}, {});

const PRIORIDADE_POR_CATEGORIA = Object.keys(CATALOGO_CATEGORIAS).reduce((acc, dep) => {
    CATALOGO_CATEGORIAS[dep].forEach(c => { acc[c.nome] = c.prioridade; });
    return acc;
}, {});

// ============================================================
// SLA por prioridade (em milissegundos)
// ============================================================

const SLA_TEMPOS = {
    'Crítica': 60 * 60 * 1000,        // 1 hora
    'Alta':    4 * 60 * 60 * 1000,    // 4 horas
    'Média':   24 * 60 * 60 * 1000,   // 24 horas
    'Baixa':   48 * 60 * 60 * 1000    // 48 horas
};

// ============================================================
// DEPARTAMENTOS
// ============================================================

const DEPARTAMENTO_INFO = {
    TI: {
        icone: 'fa-desktop',
        titulo: 'Tecnologia da Informação',
        descricao: 'Computadores, sistemas, rede, internet, e-mail e senhas'
    },
    MANUTENCAO: {
        icone: 'fa-screwdriver-wrench',
        titulo: 'Manutenção',
        descricao: 'Elétrica, hidráulica, ar-condicionado, estrutura e pintura'
    }
};

const CORES_DEPARTAMENTO = ['dep-0', 'dep-1', 'dep-2', 'dep-3', 'dep-4', 'dep-5', 'dep-6', 'dep-7'];

// ============================================================
// SETORES (fallback quando o Firestore não responde)
// ============================================================

const SETORES_PADRAO = [
    'Almoxarifado', 'CAF CR', 'CAF Principal', 'Centro Cirúrgico', 'Clínica Cirúrgica',
    'Clínica Médica I', 'Clínica Médica II', 'CME', 'Comunicação',
    'Direção Administrativa', 'Direção de Enfermagem', 'Direção Geral', 'Direção Médica',
    'Emergência/Vermelha', 'Engenharia Clínica', 'Farmácia', 'Faturamento',
    'Fisioterapia', 'Hotelaria', 'Jurídico', 'Laboratório', 'Manutenção',
    'NIR', 'Nutrição', 'Oncologia I', 'Oncologia II', 'Ouvidoria',
    'Patrimônio', 'Pediatria', 'Psicologia', 'Raio-X', 'Recepção CR',
    'Recepção Geral', 'Recepção Nefrologia', 'RH', 'SAME', 'Serviço Social',
    'SESMT', 'Telemedicina', 'Tomografia', 'UTI I', 'UTI II', 'Outros'
];
