// ============================================
// CONFIGURAÇÕES GLOBAIS DO PAINEL ADMIN
// ============================================

const SETORES_PADRAO = [
    'Almoxarifado', 'Farmacia CAF', 'Centro Cirúrgico', 'Clínica Cirurgica',
    'Clínica Médica I', 'Clínica Médica II', 'Comunicação', 'CME',
    'Direção Administrativa', 'Direção Enfermagem', 'Direção geral', 'Direção Medica',
    'Emergência/Vermelha', 'Engenharia Clinica', 'Farmácia', 'Faturamento',
    'Fisioterapia', 'Hotelaria', 'Juridico', 'Laboratório', 'Manutenção',
    'NIR', 'Nutrição', 'Oncologia I', 'Oncologia II', 'Outros', 'Ouvidoria',
    'Patrimonio', 'Pediatria', 'Psicologia', 'RH', 'Raio-X', 'Recepção CR',
    'Recepção Geral', 'Recepção Nefrologia', 'Same', 'Serviço Social', 'Sesmt',
    'Telemedicina', 'Tomografia', 'UTI I', 'UTI II'
];

const SETORES_TONERS = [
    'Administração', 'Faturamento', 'UTI I', 'UTI II', 'NIR',
    'Oncologia I & II', 'Recepção Geral', 'Recepção CR',
    'Farmácia CAF', 'Centro Cirúrgico'
];

// Variáveis globais
let setores = [...SETORES_PADRAO];
let departamentosChamados = ['TI', 'MANUTENCAO'];
let usuarioLogado = null;
let depto = 'TI';
let nomeDepto = 'Tecnologia da Informação';
let chamados = [];
let inventario = [];
let estoque = [];
let movimentacoes = [];
let charts = {};
let comentarioChamadoId = null;
let logoHospital = null;
let logoGoverno = null;