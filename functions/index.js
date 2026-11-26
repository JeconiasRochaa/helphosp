// HelpHosp — Cloud Function: redefinição de senha pelo administrador.
// Requer o plano Blaze do Firebase. Sem Blaze, use:  npm run resetar -- <usuario>
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
admin.initializeApp();

// O Firebase Authentication exige no mínimo 6 caracteres (por isso não pode ser "12345").
const SENHA_PADRAO = '123456';

exports.resetarSenha = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Faça login.');
  const db = admin.firestore();
  const eu = await db.doc(`usuarios/${req.auth.uid}`).get();
  if (!eu.exists || eu.data().status === 'inativo' || eu.data().tipo !== 'admin') throw new HttpsError('permission-denied', 'Apenas administradores podem redefinir senhas.');
  const uid = String(req.data?.uid || '');
  if (!uid) throw new HttpsError('invalid-argument', 'Usuário não informado.');
  if (uid === req.auth.uid) throw new HttpsError('invalid-argument', 'Para trocar a sua própria senha use "Alterar senha".');
  const alvo = await db.doc(`usuarios/${uid}`).get();
  if (!alvo.exists) throw new HttpsError('not-found', 'Usuário não encontrado.');
  await admin.auth().updateUser(uid, { password: SENHA_PADRAO, disabled: false });
  await alvo.ref.update({ primeiro_acesso: true, senhaResetEm: admin.firestore.FieldValue.serverTimestamp(), senhaResetPor: eu.data().nome || req.auth.uid });
  await db.collection('auditoria').add({ acao: 'equipe.resetar_senha', detalhes: { usuario: alvo.data().usuario }, uid: req.auth.uid, usuario: eu.data().usuario, nome: eu.data().nome, criadoEm: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true, senha: SENHA_PADRAO };
});
