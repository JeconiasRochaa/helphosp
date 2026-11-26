// Redefine a senha de um usuário para a senha padrão (e exige troca no próximo login).
// Alternativa gratuita à Cloud Function (não precisa do plano Blaze). Usa o mesmo serviceAccount.json do criar-admin.
//   npm run resetar -- joao.silva            → senha 123456
//   npm run resetar -- joao.silva MinhaSenha → senha escolhida
import { readFileSync, existsSync } from 'node:fs';
import admin from 'firebase-admin';

const [usuario, senha = '123456'] = process.argv.slice(2);
if (!usuario) { console.error('Informe o usuário.  Ex.: npm run resetar -- joao.silva'); process.exit(1); }
if (senha.length < 6) { console.error('O Firebase Authentication exige no mínimo 6 caracteres.'); process.exit(1); }
if (!existsSync('serviceAccount.json')) { console.error('Falta o arquivo serviceAccount.json na raiz (veja scripts/criar-admin.mjs).'); process.exit(1); }
const sufixo = process.env.VITE_AUTH_DOMAIN_SUFFIX || (existsSync('.env') && /VITE_AUTH_DOMAIN_SUFFIX=(\S+)/.exec(readFileSync('.env', 'utf8'))?.[1]) || 'helphosp.app';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync('serviceAccount.json', 'utf8'))) });
const email = usuario.includes('@') ? usuario : `${usuario}@${sufixo}`;
const u = await admin.auth().getUserByEmail(email);
await admin.auth().updateUser(u.uid, { password: senha, disabled: false });
await admin.firestore().doc(`usuarios/${u.uid}`).set({ primeiro_acesso: true, senhaResetEm: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
console.log(`Senha de "${usuario}" redefinida para: ${senha}  (será pedida a troca no próximo login)`);
