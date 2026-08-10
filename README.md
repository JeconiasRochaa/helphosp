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
