# HelpHosp 4 — React

Central de chamados de TI e Manutenção hospitalar, migrada do HTML/JS legado para **React 19 + Vite + Firebase**.

## O que mudou

**Portal público**
- Cada aparelho recebe uma identidade anônima (Firebase Anonymous Auth). O chamado grava o `deviceUid` e **"Meus chamados" mostra só os chamados daquele aparelho**. A restrição está nas regras do Firestore, não só na tela.
- Fotos anexadas: galeria com visualização ampliada (lightbox) para o solicitante e para a equipe.
- Comentários: o solicitante conversa com a equipe; a equipe também pode fazer **notas internas** (invisíveis ao solicitante).

**Painel da equipe**
- Menu lateral em **accordion / navegação aninhada** (com filtros de chamados), gaveta no celular e paleta de comandos (Ctrl+K).
- **IPs & Rede**: sub-redes (CIDR), mapa /24, bloqueio de IP/MAC duplicado, sugestão do próximo IP livre, importação/exportação CSV e histórico. (O "ping" falso foi removido: o navegador não consegue fazer ICMP.)
- Dashboard, Chamados, SLA, Indicadores (PDF/PPT), Toners, Estoque, Inventário, GestHosp, Arquivos (banco de fotos), Agenda, Equipe, Auditoria, Configurações e Painel TV.
- **Notificações profissionais**: toasts, central/sino com histórico, som, push do navegador, alertas de SLA, novo chamado e nova mensagem, diálogos de confirmação.

**Segurança**
- Login com Firebase Auth (e-mail/senha), perfis `admin | supervisor | tecnico`, bloqueio após 5 tentativas (5 min), sessão de 8 h, logout por inatividade (30 min), troca de senha obrigatória no primeiro acesso, política de senha (8+ com letras e números).
- Senhas em texto puro do sistema antigo **não existem mais**. Admins fixos no código (`edson`, `bruno`, `benicio`) foram removidos; use o perfil *supervisor*.
- Regras do Firestore/Storage (`firestore.rules`, `storage.rules`), auditoria imutável, backup que **não** inclui usuários.
- **Painéis separados**: o login pede para escolher TI ou Manutenção; cada usuário só entra no painel do próprio departamento (administradores entram em qualquer um e alternam pelo seletor "Painel" no menu lateral). Manutenção não vê as ferramentas de TI (IPs, toners, estoque, inventário, GestHosp).
- Painel TV exige login da equipe e não exibe dados pessoais.

## Como colocar no ar

1. `npm install`
2. `.env` já vem com o projeto atual (`.env.example` mostra as variáveis). Troque se usar outro projeto Firebase.
3. No **Console do Firebase**: Authentication → habilite **E-mail/senha** e **Anônimo**; adicione seu domínio em *Domínios autorizados*.
4. Publique regras e índices: `npx firebase deploy --only firestore:rules,firestore:indexes,storage`
5. **Logo após publicar as regras**, abra `/setup` e crie o primeiro administrador (a tela se bloqueia sozinha depois).
6. Em **Equipe**, recrie os técnicos (o sistema antigo guardava senhas em texto puro; contas antigas aparecem como "Cadastro antigo" para você apagar/recriar).
7. `npm run build` e hospede `dist/` (Vercel e Firebase Hosting já configurados: `vercel.json`, `firebase.json`).

Desenvolvimento: `npm run dev`.

## Criar / recuperar o administrador por script
Se o `/setup` estiver bloqueado ou você esqueceu a senha: baixe a chave em *Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave privada*, salve como `serviceAccount.json` na raiz e rode:
`npm install` e depois `npm run admin -- admin MinhaSenha123 "Seu Nome" TI`
(cria a conta no Authentication, o perfil no Firestore e trava o `/setup`; se o usuário já existir, redefine a senha).

## Segurança: regras do banco

> **O HelpHosp usa o Cloud Firestore** (o sistema antigo também usava), não o Realtime Database. As regras que protegem os dados estão em `firestore.rules` (e `storage.rules` para as fotos).
> O arquivo `database.rules.json` existe só para o caso de você ter um Realtime Database no projeto: ele nega tudo por padrão e já traz a mesma lógica (aparelho dono do chamado, equipe por departamento, admin).

Publicar tudo de uma vez: `npx firebase deploy --only firestore:rules,firestore:indexes,storage,database`

- **TI e Manutenção são isolados** nas regras: um usuário de um departamento não lê chamados, agenda, arquivos nem auditoria do outro; ferramentas de TI (IPs, inventário, estoque, toners, GestHosp) só para o TI. Só o administrador enxerga os dois (alternando o painel).
- O sistema antigo gravou o departamento de formas variadas ("Manutenção", "MANUTENCAO"…). As consultas e as regras aceitam essas variações; os novos registros usam `TI` / `MANUTENCAO`.
- Se alguma tela ficar vazia: aparece o aviso **"Dados bloqueados"** (regras não publicadas) ou **"Índice ausente"** (rode o deploy dos índices).

## Instalar como aplicativo (PWA)
Em produção (HTTPS) o navegador oferece instalar. Há botão **Instalar app** no portal, no login e no menu do usuário. No iPhone: Safari → Compartilhar → *Adicionar à Tela de Início*.

## Limitações conhecidas
- O cliente Firebase não redefine a senha de outro usuário: use o Console do Firebase ou recrie o membro.
- Links das fotos no Storage são URLs com token (qualquer pessoa com o link consegue abrir).
- Os dados antigos (chamados etc.) continuam compatíveis; chamados sem `deviceUid` só ficam visíveis para a equipe.
- Não foi possível testar contra um Firebase real durante o desenvolvimento; faça um teste ponta a ponta (abrir chamado → ver no painel → comentar) antes de ir à produção.

## Novidades (v4.1)

- **Serviços da equipe** (`/admin/servicos`): registro de serviços feitos fora de chamados (ajustes, melhorias, observações), por departamento, com fotos, filtros, KPIs, gráficos e CSV. Coleção `servicos` (regras já incluídas em `firestore.rules`).
- **Indicadores por técnico**: aba "Por técnico" em Indicadores (chamados + serviços).
- **Fotos**: solicitantes e equipe podem anexar (também em Arquivos). Se o Storage não estiver ativo, usa "modo compatível" (imagens comprimidas salvas no Firestore).
- **Sem índices compostos**: consultas ordenadas no cliente; o erro "Índice ausente" não ocorre mais.
- **Sidebar** modernizada (cores por módulo, chip do painel, recolher menu).

Publicar regras: `firebase deploy --only firestore:rules,storage`


## Novidades (v4.2)

- **Reset de senha (administrador):** botão "Resetar senha" em Equipe. A senha volta para `123456` (o Firebase exige no mínimo 6 caracteres, por isso não pode ser `12345`) e a troca é exigida no próximo acesso. Usa a Cloud Function `resetarSenha` (`functions/`, exige plano **Blaze**: `cd functions && npm install && cd .. && firebase deploy --only functions`). Sem Blaze: `npm run resetar -- usuario` (usa o `serviceAccount.json`).
- **Manutenção — Profissionais e Escala:** cadastro dos profissionais de campo, escala mensal (por turno, com repetição por período/dias da semana) e seleção de executores nos chamados e serviços (quem está na escala de hoje aparece primeiro).
- **Sessão de 24 h** (sem logout por inatividade) e **uma sessão por janela/aba** na área técnica.
- **Login:** "Salvar meu login" (lembra o usuário e pede ao navegador para guardar a senha), imagem de destaque.
- **Painel TV** público (`/tv?dep=TI` ou `/tv?dep=MANUTENCAO`), sem login, redesenhado e com relógio grande. Lê o espelho `tv_chamados` (só tipo do problema, setor, prioridade, status e técnico). O espelho é preenchido na abertura do chamado e atualizado por qualquer técnico com o sistema aberto.
- **Notificações ao solicitante:** chamado iniciado, concluído e mensagem do técnico (com sino e toque também no portal). Escolha de toque, volume e som próprio no sino.
- Formulário de chamado com um único campo de descrição; botão para **baixar fotos**.

Publicar regras: `firebase deploy --only firestore:rules,storage`
