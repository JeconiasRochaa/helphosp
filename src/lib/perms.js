import { depVariantes, normalizarDepartamento } from './format';

/** Permissões derivadas do perfil (usuarios/{uid}). Sem usuários "hardcoded". */
export function getPerms(perfil) {
  if (!perfil) return { isAdmin: false, isSupervisor: false, isTI: false, isManut: false, podeEquipe: false, podeConfig: false, podeExcluir: false, podeAuditoria: false };
  const dep = normalizarDepartamento(perfil.departamento);
  const isAdmin = perfil.tipo === 'admin';
  const isSupervisor = isAdmin || perfil.tipo === 'supervisor';
  return {
    isAdmin, isSupervisor,
    dep, depVariantes: depVariantes(dep),
    isTI: dep === 'TI',
    isManut: dep === 'MANUTENCAO',
    podeEquipe: isSupervisor,
    podeConfig: isAdmin,
    podeExcluir: isAdmin,
    podeAuditoria: isSupervisor,
    podeFerramentasTI: dep === 'TI'   // TI e Manutenção são separados: só quem está no painel de TI vê as ferramentas de TI
  };
}
