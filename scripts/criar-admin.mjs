// Cria (ou recria) o administrador do HelpHosp: conta no Firebase Authentication + perfil no Firestore.
// Também serve para REDEFINIR a senha de um usuário existente.
//
// Uso:
//   1) Console do Firebase → Configurações do projeto → Contas de serviço → "Gerar nova chave privada"
//      Salve o arquivo como  serviceAccount.json  na raiz do projeto (NUNCA envie para o GitHub).
//   2) npm install
//   3) npm run admin -- admin MinhaSenha123 "Seu Nome" TI
//                       ^usuario ^senha       ^nome      ^TI ou MANUTENCAO
import { readFileSync, existsSync } from 'node:fs';
import admin from 'firebase-admin';

const [usuario = 'admin', senha, nome = 'Administrador', dep = 'TI'] = process.argv.slice(2);
const sufixo = process.env.VITE_AUTH_DOMAIN_SUFFIX || (existsSync('.env') && /VITE_AUTH_DOMAIN_SUFFIX=(\S+)/.exec(readFileSync('.env', 'utf8'))?.[1]) || 'helphosp.app';

if (!senha || senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) { console.error('Informe uma senha com 8+ caracteres, letras e números.\nEx.: npm run admin -- admin MinhaSenha123 "Seu Nome" TI'); process.exit(1); }
if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) { console.error('Usuário inválido (3–30 caracteres: letras minúsculas, números, ponto, hífen).'); process.exit(1); }
if (!['TI', 'MANUTENCAO'].includes(dep.toUpperCase())) { console.error('Departamento deve ser TI ou MANUTENCAO.'); process.exit(1); }
if (!existsSync('serviceAccount.json')) { console.error('Falta o arquivo serviceAccount.json na raiz do projeto (veja as instruções no topo deste script).'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('serviceAccount.json', 'utf8'))) });
const email = `${usuario}@${sufixo}`;

let user;
try { user = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(user.uid, { password: senha, disabled: false }); console.log('Usuário já existia no Authentication: senha redefinida.'); }
catch (e) { if (e.code !== 'auth/user-not-found') throw e; user = await admin.auth().createUser({ email, password: senha, displayName: nome }); console.log('Usuário criado no Authentication.'); }

const db = admin.firestore(); const agora = admin.firestore.FieldValue.serverTimestamp();
await db.doc(`usuarios/${user.uid}`).set({ uid: user.uid, nome, usuario, cargo: 'Administrador', tipo: 'admin', departamento: dep.toUpperCase(), whatsapp: '', mostrarContato: false, status: 'ativo', primeiro_acesso: false, criadoEm: agora }, { merge: true });
await db.doc('configuracoes/bootstrap').set({ criadoEm: agora, por: user.uid }, { merge: true });

console.log(`\nPronto! Entre no sistema com:\n  usuário: ${usuario}\n  senha:   (a que você informou)\n  painel:  ${dep.toUpperCase()}`);
process.exit(0);
