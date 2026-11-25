/** Catálogo do registro de serviços (atividades da equipe fora dos chamados). */
export const NATUREZAS = [
  { id: 'ajuste', label: 'Ajuste necessário', cor: '#F59E0B' },
  { id: 'melhoria', label: 'Melhoria', cor: '#2F6FED' },
  { id: 'preventiva', label: 'Manutenção preventiva', cor: '#10B981' },
  { id: 'corretiva', label: 'Correção', cor: '#EF4444' },
  { id: 'instalacao', label: 'Instalação', cor: '#7C5CFC' },
  { id: 'inspecao', label: 'Inspeção / vistoria', cor: '#0FB5B0' }
];
export const CATEGORIAS = {
  TI: ['Rede e internet', 'Computadores', 'Impressoras', 'Sistemas e software', 'Telefonia / ramais', 'Segurança da informação', 'Backup', 'Servidores', 'Outros'],
  MANUTENCAO: ['Elétrica', 'Hidráulica', 'Ar-condicionado', 'Pintura e alvenaria', 'Marcenaria / serralheria', 'Equipamentos', 'Predial / estrutura', 'Jardinagem / áreas externas', 'Outros']
};
export const STATUS_SERVICO = ['Concluído', 'Em andamento', 'Pendente'];
export const naturezaDe = (id) => NATUREZAS.find((n) => n.id === id) || { id, label: id || '—', cor: '#64748B' };
