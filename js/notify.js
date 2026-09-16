/* ============================================================
   HELPHOSP — CENTRAL DE NOTIFICAÇÕES v3.0
   Popups (toast), diálogos de confirmação, lightbox e sons.
   Carregar em TODAS as páginas, logo após theme.css.
   ============================================================ */

(function (global) {
    'use strict';

    // --------------------------------------------------------
    // Utilidades
    // --------------------------------------------------------
    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function stack() {
        let el = document.getElementById('hh-toast-stack');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hh-toast-stack';
            el.setAttribute('role', 'region');
            el.setAttribute('aria-live', 'polite');
            el.setAttribute('aria-label', 'Notificações');
            document.body.appendChild(el);
        }
        return el;
    }

    const PRESETS = {
        success:  { icon: 'fa-check',              title: 'Tudo certo' },
        error:    { icon: 'fa-triangle-exclamation', title: 'Erro' },
        warning:  { icon: 'fa-circle-exclamation', title: 'Atenção' },
        info:     { icon: 'fa-circle-info',        title: 'Informação' },
        critical: { icon: 'fa-bolt',               title: 'Urgente' }
    };

    const MAX_TOASTS = 4;

    // --------------------------------------------------------
    // Áudio (toque de notificação) — Web Audio API
    // --------------------------------------------------------
    let ctx = null;
    let audioLiberado = false;

    function audioCtx() {
        if (!ctx) {
            const AC = global.AudioContext || global.webkitAudioContext;
            if (!AC) return null;
            try { ctx = new AC(); } catch (e) { return null; }
        }
        if (ctx.state === 'suspended') ctx.resume().catch(function () {});
        return ctx;
    }

    function liberarAudio() {
        audioLiberado = true;
        audioCtx();
    }
    ['click', 'keydown', 'touchstart'].forEach(function (ev) {
        document.addEventListener(ev, liberarAudio, { once: true, passive: true });
    });

    /**
     * Toca uma nota com envelope suave (sem estalos).
     */
    function nota(freq, inicio, duracao, volume, tipo) {
        const ac = audioCtx();
        if (!ac) return;
        const t0 = ac.currentTime + inicio;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const filtro = ac.createBiquadFilter();

        filtro.type = 'lowpass';
        filtro.frequency.value = 4200;

        osc.type = tipo || 'sine';
        osc.frequency.setValueAtTime(freq, t0);

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);

        osc.connect(filtro);
        filtro.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + duracao + 0.05);
    }

    /**
     * Toques do sistema. Timbre limpo, tipo "aviso de hospital moderno".
     *  novo      → dó–sol ascendente (bi-tom curto)
     *  critico   → tri-tom de alerta repetido
     *  atrasado  → dois toques graves de advertência
     *  concluido → arpejo curto de conclusão
     *  erro      → tom descendente
     */
    function toque(tipo) {
        const ac = audioCtx();
        if (!ac) return;
        switch (tipo) {
            case 'critico':
                [0, 0.34, 0.68].forEach(function (t) {
                    nota(987.77, t, 0.14, 0.32, 'triangle');   // B5
                    nota(1318.51, t + 0.11, 0.18, 0.30, 'triangle'); // E6
                });
                break;
            case 'atrasado':
                nota(440.00, 0, 0.26, 0.26, 'triangle');
                nota(349.23, 0.28, 0.34, 0.24, 'triangle');
                break;
            case 'concluido':
                nota(659.25, 0, 0.12, 0.20, 'sine');
                nota(830.61, 0.10, 0.12, 0.20, 'sine');
                nota(1046.50, 0.20, 0.26, 0.20, 'sine');
                break;
            case 'erro':
                nota(392.00, 0, 0.16, 0.22, 'triangle');
                nota(261.63, 0.15, 0.28, 0.20, 'triangle');
                break;
            case 'novo':
            default:
                nota(783.99, 0, 0.13, 0.24, 'sine');   // G5
                nota(1174.66, 0.12, 0.22, 0.22, 'sine'); // D6
                break;
        }
    }

    // --------------------------------------------------------
    // Toast
    // --------------------------------------------------------
    /**
     * HH.toast('mensagem', 'success')
     * HH.toast({ titulo, mensagem, tipo, duracao, som, acao: {texto, onClick} })
     */
    function toast(arg, tipoLegado) {
        const opt = (typeof arg === 'string' || typeof arg === 'number')
            ? { mensagem: String(arg), tipo: tipoLegado || 'info' }
            : (arg || {});

        let tipo = opt.tipo || 'info';
        if (!PRESETS[tipo]) tipo = 'info';

        const preset = PRESETS[tipo];
        const duracao = opt.duracao === 0 ? 0 : (opt.duracao || (tipo === 'critical' ? 9000 : 4500));

        // Remove emojis duplicados de mensagens legadas (já temos ícone)
        let mensagem = String(opt.mensagem === undefined ? '' : opt.mensagem)
            .replace(/^\s*[\u2700-\u27BF\uE000-\uF8FF\u2011-\u26FF\uD83C-\uDBFF\uDC00-\uDFFF]+\s*/u, '')
            .trim();

        const titulo = opt.titulo || preset.title;
        const box = stack();

        while (box.children.length >= MAX_TOASTS) box.firstElementChild.remove();

        const el = document.createElement('div');
        el.className = 'hh-toast ' + tipo;
        el.setAttribute('role', tipo === 'error' || tipo === 'critical' ? 'alert' : 'status');

        el.innerHTML =
            '<div class="hh-toast__icon"><i class="fas ' + preset.icon + '"></i></div>' +
            '<div class="hh-toast__body">' +
                '<div class="hh-toast__title">' + esc(titulo) + '</div>' +
                (mensagem ? '<div class="hh-toast__msg">' + esc(mensagem) + '</div>' : '') +
            '</div>' +
            '<button class="hh-toast__close" aria-label="Fechar">&times;</button>' +
            (duracao ? '<div class="hh-toast__bar" style="animation-duration:' + duracao + 'ms"></div>' : '');

        function fechar() {
            if (el.dataset.saindo) return;
            el.dataset.saindo = '1';
            el.classList.add('hh-out');
            setTimeout(function () { el.remove(); }, 300);
        }

        el.querySelector('.hh-toast__close').addEventListener('click', fechar);

        if (opt.acao && opt.acao.texto) {
            const btn = document.createElement('button');
            btn.className = 'hh-dialog__btn solid';
            btn.style.cssText = 'margin-top:8px;padding:6px 12px;font-size:11px;';
            btn.textContent = opt.acao.texto;
            btn.addEventListener('click', function () {
                try { opt.acao.onClick && opt.acao.onClick(); } finally { fechar(); }
            });
            el.querySelector('.hh-toast__body').appendChild(btn);
        }

        box.appendChild(el);

        if (opt.som !== false && audioLiberado) {
            toque(opt.som || (tipo === 'critical' ? 'critico'
                : tipo === 'error' ? 'erro'
                : tipo === 'success' ? 'concluido' : 'novo'));
        }

        if (duracao) {
            let timer = setTimeout(fechar, duracao);
            el.addEventListener('mouseenter', function () {
                clearTimeout(timer);
                const bar = el.querySelector('.hh-toast__bar');
                if (bar) bar.style.animationPlayState = 'paused';
            });
            el.addEventListener('mouseleave', function () {
                timer = setTimeout(fechar, 1600);
                const bar = el.querySelector('.hh-toast__bar');
                if (bar) bar.style.animationPlayState = 'running';
            });
        }

        return { fechar: fechar, el: el };
    }

    // --------------------------------------------------------
    // Diálogos (substituem alert/confirm nativos)
    // --------------------------------------------------------
    function dialogo(opt) {
        return new Promise(function (resolve) {
            const backdrop = document.createElement('div');
            backdrop.className = 'hh-dialog-backdrop';

            const variante = opt.variante || 'info';
            const icones = { info: 'fa-circle-info', danger: 'fa-triangle-exclamation', warning: 'fa-circle-exclamation', success: 'fa-check' };

            backdrop.innerHTML =
                '<div class="hh-dialog" role="dialog" aria-modal="true">' +
                    '<div class="hh-dialog__top">' +
                        '<div class="hh-dialog__icon ' + variante + '"><i class="fas ' + (icones[variante] || icones.info) + '"></i></div>' +
                        '<div class="hh-dialog__title">' + esc(opt.titulo || 'Confirmar') + '</div>' +
                    '</div>' +
                    '<div class="hh-dialog__text">' + (opt.html || esc(opt.texto || '')) + '</div>' +
                    '<div class="hh-dialog__actions">' +
                        (opt.tipo === 'alert' ? '' :
                            '<button class="hh-dialog__btn ghost" data-hh="no">' + esc(opt.cancelar || 'Cancelar') + '</button>') +
                        '<button class="hh-dialog__btn solid' + (variante === 'danger' ? ' danger' : '') + '" data-hh="yes">' +
                            esc(opt.confirmar || (opt.tipo === 'alert' ? 'Entendi' : 'Confirmar')) +
                        '</button>' +
                    '</div>' +
                '</div>';

            function finalizar(valor) {
                backdrop.remove();
                document.removeEventListener('keydown', onKey);
                resolve(valor);
            }
            function onKey(e) {
                if (e.key === 'Escape') finalizar(false);
                if (e.key === 'Enter') finalizar(true);
            }

            backdrop.addEventListener('click', function (e) {
                if (e.target === backdrop) finalizar(false);
                const alvo = e.target.closest('[data-hh]');
                if (alvo) finalizar(alvo.dataset.hh === 'yes');
            });
            document.addEventListener('keydown', onKey);

            document.body.appendChild(backdrop);
            const btn = backdrop.querySelector('[data-hh="yes"]');
            if (btn) btn.focus();
        });
    }

    function confirmar(texto, opt) {
        opt = opt || {};
        return dialogo({
            titulo: opt.titulo || 'Confirmar ação',
            texto: texto,
            variante: opt.variante || 'danger',
            confirmar: opt.confirmar || 'Confirmar',
            cancelar: opt.cancelar || 'Cancelar'
        });
    }

    function alerta(texto, opt) {
        opt = opt || {};
        return dialogo({
            tipo: 'alert',
            titulo: opt.titulo || 'Aviso',
            texto: texto,
            variante: opt.variante || 'info',
            confirmar: opt.confirmar || 'Entendi'
        });
    }

    // --------------------------------------------------------
    // Popup rico de novo chamado (usado no painel e na TV)
    // --------------------------------------------------------
    function novoChamado(c, opcoes) {
        opcoes = opcoes || {};
        const prio = c.prioridade || 'Média';
        const tipo = prio === 'Crítica' ? 'critical' : prio === 'Alta' ? 'warning' : 'info';
        const partes = [];
        if (c.setor) partes.push('Setor: ' + c.setor);
        if (c.solicitante) partes.push('Solicitante: ' + c.solicitante);
        if (c.fotos && c.fotos.length) partes.push(c.fotos.length + ' foto(s) anexada(s)');

        return toast({
            titulo: (prio === 'Crítica' ? 'Chamado crítico' : 'Novo chamado') + ' · ' + prio,
            mensagem: (c.titulo || 'Sem título') + (partes.length ? ' — ' + partes.join(' · ') : ''),
            tipo: tipo,
            duracao: prio === 'Crítica' ? 12000 : 7000,
            som: prio === 'Crítica' ? 'critico' : 'novo',
            acao: opcoes.acao
        });
    }

    // --------------------------------------------------------
    // Lightbox de fotos
    // --------------------------------------------------------
    function lightbox(url) {
        if (!url) return;
        const box = document.createElement('div');
        box.className = 'hh-lightbox';
        box.innerHTML =
            '<button class="hh-lightbox__close" aria-label="Fechar">&times;</button>' +
            '<img src="' + esc(url) + '" alt="Foto do chamado">';
        function fechar() {
            box.remove();
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) { if (e.key === 'Escape') fechar(); }
        box.addEventListener('click', fechar);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(box);
    }

    // --------------------------------------------------------
    // Notificações nativas do navegador
    // --------------------------------------------------------
    async function pedirPermissaoPush() {
        if (!('Notification' in global)) return 'unsupported';
        if (Notification.permission !== 'default') return Notification.permission;
        try {
            const r = await Notification.requestPermission();
            if (r === 'granted') toast({ titulo: 'Notificações ativadas', mensagem: 'Você receberá alertas de novos chamados.', tipo: 'success' });
            return r;
        } catch (e) { return 'default'; }
    }

    function push(titulo, opcoes) {
        if (!('Notification' in global) || Notification.permission !== 'granted') return;
        const base = {
            icon: 'icons/icon-192x192.png',
            badge: 'icons/icon-72x72.png',
            vibrate: [180, 90, 180],
            silent: false
        };
        const finais = Object.assign(base, opcoes || {});
        try {
            if (global.navigator && navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(titulo, finais); });
            } else {
                new Notification(titulo, finais);
            }
        } catch (e) { /* silencioso */ }
    }

    // --------------------------------------------------------
    // API pública
    // --------------------------------------------------------
    const HH = {
        toast: toast,
        sucesso: function (m, o) { return toast(Object.assign({ mensagem: m, tipo: 'success' }, o || {})); },
        erro: function (m, o) { return toast(Object.assign({ mensagem: m, tipo: 'error' }, o || {})); },
        aviso: function (m, o) { return toast(Object.assign({ mensagem: m, tipo: 'warning' }, o || {})); },
        info: function (m, o) { return toast(Object.assign({ mensagem: m, tipo: 'info' }, o || {})); },
        critico: function (m, o) { return toast(Object.assign({ mensagem: m, tipo: 'critical' }, o || {})); },
        confirmar: confirmar,
        alerta: alerta,
        dialogo: dialogo,
        novoChamado: novoChamado,
        lightbox: lightbox,
        toque: toque,
        liberarAudio: liberarAudio,
        pedirPermissaoPush: pedirPermissaoPush,
        push: push,
        esc: esc
    };

    global.HH = HH;

    // Aliases usados pelo código existente do sistema
    global.toast = function (m, t) { return toast(m, t); };
    global.mostrarToast = function (m, t) { return toast(m, t); };
    global.abrirLightbox = lightbox;
    global.hhConfirmar = confirmar;
})(window);
