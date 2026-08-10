# 🏥 HelpHosp - Sistema de Chamados Hospitalar

![Versão](https://img.shields.io/badge/versão-2.0.0-blue)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Storage-orange)
![Licença](https://img.shields.io/badge/licença-MIT-green)
![Status](https://img.shields.io/badge/status-Produção-brightgreen)

Sistema completo para gerenciamento de chamados técnicos hospitalares, separado por departamentos (TI e Manutenção), com portal público, painel administrativo e painel TV para monitoramento.

---

## 📋 **Funcionalidades**

### 🌐 **Portal Público**
- Abertura de chamados por departamento (TI e Manutenção)
- Formulário de cadastro de profissionais (GestHosp)
- Visualização de chamados do dia
- Contatos de suporte via WhatsApp
- Interface responsiva e intuitiva

### 🔐 **Área Técnica (Login)**
- Autenticação por departamento
- Controle de tentativas (bloqueio após 5 erros)
- Sessão de 8 horas
- Design moderno com animações

### 📊 **Painel Administrativo**
- **Dashboard**: Visão geral com cards, gráficos e últimos serviços
- **Chamados**: Lista completa com filtros, avanço de status e comentários
- **Monitor SLA**: Controle de prazos por prioridade
- **Indicadores**: 8 gráficos, filtro por período, exportação PDF e PowerPoint
- **GestHosp**: Gerenciamento de cadastros de profissionais
- **Toners**: Monitor de trocas com histórico e relatórios
- **Estoque**: Controle de equipamentos e movimentação
- **Inventário**: Equipamentos por setor
- **IPs & Rede**: Cadastro de dispositivos de rede
- **Equipe**: Gerenciamento de técnicos
- **Arquivos**: Upload de fotos com barra de progresso
- **Agenda**: Compromissos e agendamentos
- **Configurações**: Senha, logos, setores, backup, notificações

### 📺 **Painel TV**
- Monitoramento em tempo real
- Alertas visuais para chamados atrasados
- Notificação sonora (bip + voz)
- Design estilo Matrix para telas grandes
- Filtro por departamento via URL

### 🔔 **Notificações**
- Push notifications no navegador
- Integração com WhatsApp
- Alertas sonoros no painel TV

### 📱 **PWA**
- Instalável como aplicativo
- Funcionamento offline básico
- Service Worker para cache

---

## 🚀 **Tecnologias Utilizadas**

| Tecnologia | Uso |
|------------|-----|
| **Firebase Firestore** | Banco de dados principal |
| **Firebase Storage** | Armazenamento de arquivos e logos |
| **Chart.js** | Gráficos e dashboards |
| **html2canvas** | Captura de telas para PDF |
| **jsPDF** | Geração de relatórios PDF |
| **PptxGenJS** | Geração de apresentações PowerPoint |
| **Font Awesome** | Ícones |
| **SpeechSynthesis API** | Voz no painel TV |
| **Web Audio API** | Sons de alerta |
| **Service Worker** | PWA e cache offline |

---

## 📁 **Estrutura do Projeto**
helphosp/
├── index.html # Portal público
├── login.html # Tela de login
├── admin.html # Painel administrativo
├── painel_tv.html # Painel TV
├── manifest.json # Configuração PWA
├── service-worker.js # Service Worker
├── README.md # Documentação
├── css/
│ ├── styles.css # Estilos do portal
│ └── admin.css # Estilos do painel admin
├── js/
│ ├── config.js # Configurações do portal
│ ├── firebase.js # Firebase do portal
│ ├── ui.js # Interface do portal
│ ├── forms.js # Formulários do portal
│ ├── chamados.js # Chamados do portal
│ ├── main.js # Inicialização do portal
│ ├── admin-config.js # Configurações admin
│ ├── admin-firebase.js # Firebase admin
│ ├── admin-auth.js # Autenticação
│ ├── admin-utils.js # Utilitários
│ ├── admin-ui.js # Interface admin
│ ├── admin-dashboard.js # Dashboard
│ ├── admin-chamados.js # Chamados
│ ├── admin-gesthosp.js # GestHosp
│ ├── admin-sla.js # Monitor SLA
│ ├── admin-indicadores.js # Indicadores
│ ├── admin-toners.js # Toners
│ ├── admin-estoque.js # Estoque
│ ├── admin-inventario.js # Inventário
│ ├── admin-ips.js # IPs & Rede
│ ├── admin-equipe.js # Equipe
│ ├── admin-arquivos.js # Arquivos
│ ├── admin-agenda.js # Agenda
│ ├── admin-configuracoes.js # Configurações
│ └── admin-main.js # Inicialização admin
└── icons/ # Ícones PWA e favicon
├── favicon.png
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png

text

---

## ⚙️ **Configuração**

### 1. **Firebase**
O sistema usa Firebase como backend. Configure no arquivo `js/firebase.js` e `js/admin-firebase.js`:

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_DOMINIO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_BUCKET.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};
2. Regras do Firestore
javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Ajuste para produção
    }
  }
}
3. Regras do Storage
javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Ajuste para produção
    }
  }
}
4. Criar primeiro usuário admin
Execute no console do navegador (F12):

javascript
db.collection('usuarios').add({
    nome: "Administrador",
    usuario: "admin",
    senha: "12345",
    cargo: "Coordenador",
    tipo: "admin",
    departamento: "TI",
    whatsapp: "11999999999",
    mostrarContato: true,
    status: "ativo",
    primeiro_acesso: false
});
🚀 Instalação
Clone ou faça download do projeto

bash
git clone https://github.com/seu-usuario/helphosp.git
Configure o Firebase

Crie um projeto no Firebase Console

Ative Firestore Database e Storage

Copie as credenciais para os arquivos de configuração

Hospede os arquivos

Pode usar Firebase Hosting, Netlify, Vercel ou qualquer servidor web

Para Firebase Hosting:

bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
Acesse o sistema

Portal público: https://seu-dominio.com/index.html

Área técnica: https://seu-dominio.com/login.html

Painel TV TI: https://seu-dominio.com/painel_tv.html?dep=TI

Painel TV Manutenção: https://seu-dominio.com/painel_tv.html?dep=MANUTENCAO

👥 Tipos de Usuários
Tipo	Descrição	Permissões
admin	Administrador	Acesso total, gestão de equipe, backup
tecnico	Técnico	Chamados do seu departamento
supervisor	Supervisor	Gestão de equipe do departamento
📊 Fluxo de Chamados
text
1. Usuário abre chamado no portal
       ↓
2. Chamado aparece no painel do departamento
       ↓
3. Técnico altera status: A Fazer → Em Andamento
       ↓
4. Técnico trabalha no chamado
       ↓
5. Status avança: Em Andamento → Pendente → Concluído
       ↓
6. Opcional: Notificação WhatsApp para solicitante
🎨 Temas
O sistema suporta tema claro e escuro:

Alternar no botão 🌙 na sidebar

Preferência salva no localStorage

Padrão: tema claro

📱 PWA
O sistema é instalável como aplicativo:

Clique em "Instalar" no navegador

Ou use o botão flutuante "Instalar App"

Funciona offline para recursos básicos

🔒 Segurança
Senhas armazenadas no Firestore (recomenda-se hash em produção)

Sessão expira após 8 horas

Bloqueio após 5 tentativas de login erradas

Separação por departamento

Sanitização de inputs contra XSS

📈 Exportação de Dados
PDF: Relatórios gerenciais e indicadores

PowerPoint: Apresentações com gráficos

JSON: Backup completo do sistema

🐛 Solução de Problemas
Painel TV não carrega
Verifique se o Firestore tem chamados com campo departamento

Acesse com ?dep=TI ou ?dep=MANUTENCAO

Abra o console (F12) para ver erros

Upload de fotos não funciona
Verifique as regras do Firebase Storage

Tamanho máximo: 10MB

Apenas imagens são aceitas

Login não funciona
Verifique se o usuário existe na coleção usuarios

Status deve ser ativo

Departamento deve corresponder ao selecionado

📝 Changelog
v2.0.0 (Atual)
✅ Interface de configurações renovada com abas

✅ Cards modernos em todos os módulos

✅ Painel TV com alertas de atraso e voz

✅ Exportação PowerPoint

✅ Integração WhatsApp

✅ PWA instalável

✅ Push notifications

✅ Backup e restauração

v1.0.0
✅ Portal público funcional

✅ Painel administrativo

✅ Gestão de chamados

✅ Dashboard com gráficos

🤝 Contribuição
Contribuições são bem-vindas! Para contribuir:

Faça um fork do projeto

Crie uma branch: git checkout -b feature/nova-funcionalidade

Commit: git commit -m 'Adiciona nova funcionalidade'

Push: git push origin feature/nova-funcionalidade

Abra um Pull Request

📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

👨‍💻 Desenvolvido por
HelpHosp - Sistema de Chamados Hospitalar

📞 Suporte
Para suporte, abra uma issue no GitHub ou entre em contato pelo WhatsApp dos técnicos cadastrados no sistema.

🏥 HelpHosp - Tecnologia a serviço da saúde!

text

## 📝 **Para usar:**

1. Crie um arquivo chamado `README.md` na raiz do projeto
2. Cole o conteúdo acima
3. Ajuste as informações:
   - Links do GitHub (se tiver)
   - Nome do desenvolvedor
   - Dados de contato

O README ficará visível automaticamente se você hospedar no GitHub! 📄✨
