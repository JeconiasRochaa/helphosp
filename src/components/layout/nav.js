import {
  LayoutDashboard, Ticket, Clock, LineChart, Hospital, Printer, Boxes, ClipboardList, Network, Users, ShieldCheck,
  FolderOpen, CalendarDays, ClipboardCheck, Settings, UserCog, Tv, ListTodo, AlertTriangle, CheckCircle2, Layers, Server, History, Globe, Inbox
} from 'lucide-react';

/**
 * Estrutura do menu (accordion / navegação aninhada).
 * Item com `children` vira grupo expansível. `perm(perms)` controla visibilidade.
 * `badge` referencia uma chave calculada no Sidebar.
 */
export const MENU = [
  { titulo: 'Principal', itens: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/admin', end: true },
    { id: 'chamados', label: 'Chamados', icon: Ticket, to: '/admin/chamados', badge: 'abertos', children: [
      { label: 'Todos', icon: Layers, to: '/admin/chamados', end: true },
      { label: 'Em aberto', icon: Inbox, to: '/admin/chamados?f=abertos' },
      { label: 'Atrasados', icon: AlertTriangle, to: '/admin/chamados?f=atrasados', badge: 'atrasados', badgeTom: 'vermelho' },
      { label: 'Concluídos', icon: CheckCircle2, to: '/admin/chamados?f=concluidos' }
    ] },
    { id: 'servicos', label: 'Serviços da equipe', icon: ClipboardCheck, to: '/admin/servicos' },
    { id: 'sla', label: 'Monitor SLA', icon: Clock, to: '/admin/sla', badge: 'atrasados' },
    { id: 'indicadores', label: 'Indicadores', icon: LineChart, to: '/admin/indicadores' },
    { id: 'tv', label: 'Painel TV', icon: Tv, to: '/tv', externo: true }
  ] },
  { titulo: 'Gestão de TI', perm: (p) => p.podeFerramentasTI, itens: [
    { id: 'gesthosp', label: 'GestHosp', icon: Hospital, to: '/admin/gesthosp', badge: 'gesthosp' },
    { id: 'toners', label: 'Toners', icon: Printer, to: '/admin/toners' },
    { id: 'estoque', label: 'Estoque', icon: Boxes, to: '/admin/estoque' },
    { id: 'inventario', label: 'Inventário', icon: ClipboardList, to: '/admin/inventario' },
    { id: 'ips', label: 'IPs & Rede', icon: Network, to: '/admin/ips', children: [
      { label: 'Dispositivos', icon: Server, to: '/admin/ips', end: true },
      { label: 'Sub-redes e mapa', icon: Globe, to: '/admin/ips/redes' },
      { label: 'Histórico', icon: History, to: '/admin/ips/historico' }
    ] }
  ] },
  { titulo: 'Administração', perm: (p) => p.podeEquipe, itens: [
    { id: 'equipe', label: 'Equipe', icon: Users, to: '/admin/equipe' },
    { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck, to: '/admin/auditoria' }
  ] },
  { titulo: 'Recursos', itens: [
    { id: 'arquivos', label: 'Arquivos', icon: FolderOpen, to: '/admin/arquivos' },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, to: '/admin/agenda', badge: 'agenda' },
    { id: 'config', label: 'Configurações', icon: Settings, to: '/admin/config', permLabel: (p) => (p.isAdmin ? 'Configurações' : 'Minha conta'), iconAlt: UserCog }
  ] }
];
export const TODOS_ITENS = MENU.flatMap((g) => g.perm ? g.itens.map((i) => ({ ...i, _perm: g.perm })) : g.itens)
  .flatMap((i) => [i, ...(i.children || []).map((c) => ({ ...c, id: i.label + c.label, label: `${i.label} › ${c.label}`, _perm: i._perm }))]);
export { ListTodo };
