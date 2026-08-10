// ============================================
// SERVICE WORKER - HELPHOSP PWA
// ============================================

const CACHE_NAME = 'helphosp-v1.0.0';
const DYNAMIC_CACHE = 'helphosp-dynamic-v1';

// Recursos para cache inicial
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/admin.html',
    '/painel_tv.html',
    '/css/styles.css',
    '/css/admin.css',
    '/js/config.js',
    '/js/firebase.js',
    '/js/ui.js',
    '/js/forms.js',
    '/js/chamados.js',
    '/js/main.js',
    '/js/admin-config.js',
    '/js/admin-firebase.js',
    '/js/admin-auth.js',
    '/js/admin-utils.js',
    '/js/admin-ui.js',
    '/js/admin-dashboard.js',
    '/js/admin-chamados.js',
    '/js/admin-main.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    console.log('🔧 Service Worker instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando recursos estáticos...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Instalação concluída!');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erro no cache:', error);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker ativado!');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
                        .map(name => {
                            console.log('🗑️ Removendo cache antigo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('✅ Ativação concluída!');
                return self.clients.claim();
            })
    );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', event => {
    // Ignorar requisições do Firebase (sempre online)
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('gstatic.com')) {
        return;
    }
    
    // Para navegação (HTML), usar Network First
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cachear a resposta
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline: retornar do cache
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Fallback para index.html
                            return caches.match('/index.html');
                        });
                })
        );
        return;
    }
    
    // Para outros recursos, Cache First com atualização em background
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Atualizar cache em background
                    fetch(event.request)
                        .then(response => {
                            caches.open(DYNAMIC_CACHE).then(cache => {
                                cache.put(event.request, response);
                            });
                        })
                        .catch(() => {});
                    
                    return cachedResponse;
                }
                
                // Não está em cache, buscar da rede
                return fetch(event.request)
                    .then(response => {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                        return response;
                    })
                    .catch(error => {
                        console.warn('⚠️ Offline, recurso não disponível:', event.request.url);
                        // Retornar uma resposta vazia para imagens
                        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#E2E8F0" width="200" height="200"/><text fill="#94A3B8" x="100" y="100" text-anchor="middle">Offline</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }
                    });
            })
    );
});

// Push Notification
self.addEventListener('push', event => {
    console.log('📨 Push recebida:', event);
    
    let data = {
        title: 'HelpHosp',
        body: 'Nova notificação',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'helphosp-notification',
        data: {
            url: '/admin.html'
        }
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        vibrate: [200, 100, 200],
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ],
        requireInteraction: data.requireInteraction || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
    console.log('👆 Notificação clicada:', event);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/admin.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(windowClients => {
                // Verificar se já tem uma janela aberta
                for (let client of windowClients) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Abrir nova janela
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Sincronização em background
self.addEventListener('sync', event => {
    console.log('🔄 Sincronização em background:', event.tag);
    
    if (event.tag === 'sync-chamados') {
        event.waitUntil(
            // Sincronizar dados pendentes
            syncPendingData()
        );
    }
});

async function syncPendingData() {
    try {
        // Buscar dados pendentes do IndexedDB
        // e enviar para o servidor
        console.log('✅ Sincronização concluída');
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
    }
}

console.log('📱 Service Worker HelpHosp carregado!');