/**
 * Firebase Cloud Functions v2 — Financy Tracker
 * Deploy: npx firebase deploy --only functions
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getAuth }            = require('firebase-admin/auth');
const { getFirestore }       = require('firebase-admin/firestore');

initializeApp();

function emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._]/g, '_');
}

exports.applyPasswordReset = onCall({ region: 'southamerica-east1' }, async (request) => {
  const { email, code, newPassword } = request.data || {};

  if (!email || !code || !newPassword) {
    throw new HttpsError('invalid-argument', 'missing_fields');
  }
  if (String(newPassword).length < 6) {
    throw new HttpsError('invalid-argument', 'weak_password');
  }

  const mail = String(email).trim().toLowerCase();
  const key  = emailKey(mail);

  const db   = getFirestore();
  const snap = await db.doc(`passwordResetCodes/${key}`).get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'code_not_found');
  }

  const stored = snap.data();

  if (stored.used) {
    throw new HttpsError('failed-precondition', 'code_used');
  }
  if (Date.now() > stored.expiresAt) {
    throw new HttpsError('deadline-exceeded', 'code_expired');
  }
  if (stored.code !== String(code).trim()) {
    throw new HttpsError('unauthenticated', 'code_invalid');
  }

  try {
    const userRecord = await getAuth().getUserByEmail(mail);
    await getAuth().updateUser(userRecord.uid, { password: String(newPassword) });
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'user_not_found');
    }
    console.error('[applyPasswordReset] updateUser failed', e);
    throw new HttpsError('internal', 'update_failed');
  }

  await snap.ref.update({ used: true });
  return { success: true };
});
