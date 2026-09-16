// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// O sistema de popups de notificação vive em js/notify.js.
// `toast()` e `mostrarToast()` são expostos globalmente por lá,
// portanto não há nada a redefinir aqui.

function fmtData(d) {
    if (!d) return '—';
    try {
        const dt = d?.toDate ? d.toDate() : new Date(d);
        if (isNaN(dt.getTime())) return '—';
        return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
}

function fmtDataCurta(d) {
    if (!d) return '—';
    try {
        const dt = d?.toDate ? d.toDate() : new Date(d);
        if (isNaN(dt.getTime())) return '—';
        const a = new Date();
        const diff = Math.floor((a - dt) / 1000);
        if (diff < 60) return 'agora';
        if (diff < 3600) return Math.floor(diff / 60) + 'min';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        return Math.floor(diff / 86400) + 'd';
    } catch (e) { return '—'; }
}

function toDate(d) {
    if (!d) return new Date(0);
    return d?.toDate ? d.toDate() : new Date(d);
}

function sanitizar(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function getStatusClass(s) {
    const c = { 'Concluído': 'badge-green', 'Em Andamento': 'badge-amber', 'Pendente': 'badge-red', 'A Fazer': 'badge-blue' };
    return c[s] || 'badge-blue';
}

function getPrioridadeClass(p) {
    const c = { 'Baixa': 'badge-blue', 'Média': 'badge-amber', 'Alta': 'badge-red', 'Crítica': 'badge-red' };
    return c[p] || 'badge-blue';
}

function abrirModal(conteudo, mw = '750px') {
    const m = document.createElement('div');
    m.className = 'modal-overlay ativa';
    m.innerHTML = `<div class="modal-box" style="max-width:${mw};">${conteudo}</div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    return m;
}

function normalizarDepartamento(v) {
    const s = (v || '').toString().trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('MANUT')) return 'MANUTENCAO';
    if (s === 'TI' || s.includes('TECNOLOGIA') || s.includes('INFORMATICA')) return 'TI';
    return s;
}

function departamentoAtual() {
    return normalizarDepartamento(depto || usuarioLogado?.departamento || 'TI');
}

function getSLAStatus(c) {
    if (c.status === 'Concluído') return 'sla-ok';
    const sla = (typeof SLA_TEMPOS !== 'undefined') ? SLA_TEMPOS
        : { 'Crítica': 3600000, 'Alta': 14400000, 'Média': 86400000, 'Baixa': 172800000 };
    const ab = toDate(c.data_abertura), ag = new Date(), pr = sla[c.prioridade] || 86400000, tr = pr - (ag - ab);
    if (tr <= 0) return 'sla-critical';
    if (tr < pr * 0.3) return 'sla-warning';
    return 'sla-ok';
}

function getSLATexto(c) {
    const s = getSLAStatus(c);
    if (s === 'sla-critical') return '🔴 Atrasado';
    if (s === 'sla-warning') return '🟡 Próximo';
    return '🟢 No prazo';
}

function toggleTheme() {
    const h = document.documentElement, i = document.getElementById('themeIcon');
    if (h.getAttribute('data-theme') === 'dark') {
        h.removeAttribute('data-theme');
        i.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        h.setAttribute('data-theme', 'dark');
        i.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

function initTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fas fa-sun';
    }
}
// ============================================
// FOTOS — compressão e upload compartilhados
// ============================================

const HH_FOTO_MAX_LADO = 1600;
const HH_FOTO_QUALIDADE = 0.82;

/**
 * Reduz a imagem no navegador antes do upload (mesmo comportamento do
 * portal público), evitando fotos gigantes vindas de celulares/câmeras.
 */
function comprimirImagemAdmin(file) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) { reject(new Error('Arquivo não é imagem')); return; }

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                let { width, height } = img;
                const escala = Math.min(1, HH_FOTO_MAX_LADO / Math.max(width, height));
                width = Math.round(width * escala);
                height = Math.round(height * escala);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('Falha ao processar imagem')); return; }
                    resolve(blob);
                }, 'image/jpeg', HH_FOTO_QUALIDADE);
            } catch (e) { reject(e); }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem')); };
        img.src = url;
    });
}

/**
 * Envia um conjunto de arquivos de imagem para uma pasta do Storage e
 * devolve as URLs públicas. Usa compressão automática.
 */
async function enviarFotosAdmin(arquivos, pastaBase, onProgress) {
    const urls = [];
    const total = arquivos.length;

    for (let i = 0; i < total; i++) {
        const file = arquivos[i];
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) { toast(`"${file.name}" passa de 10 MB.`, 'error'); continue; }

        const blob = await comprimirImagemAdmin(file);
        const nome = `${pastaBase}/${Date.now()}_${i + 1}.jpg`;
        const ref = storage.ref(nome);

        await new Promise((resolve, reject) => {
            const task = ref.put(blob, { contentType: 'image/jpeg' });
            task.on('state_changed',
                snap => { if (onProgress) onProgress(Math.round(((i + (snap.bytesTransferred / (snap.totalBytes||1))) / total) * 100)); },
                reject,
                async () => { try { urls.push(await task.snapshot.ref.getDownloadURL()); resolve(); } catch (e) { reject(e); } }
            );
        });
    }

    if (onProgress) onProgress(100);
    return urls;
}
