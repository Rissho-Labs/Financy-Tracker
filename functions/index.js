/**
 * Firebase Cloud Functions v2 — Financy Tracker
 * Deploy: npx firebase deploy --only functions
 *
 * Defina DEEPSEEK_API_KEY antes do deploy:
 *   firebase functions:secrets:set DEEPSEEK_API_KEY
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const { initializeApp }      = require('firebase-admin/app');
const { getAuth }            = require('firebase-admin/auth');
const { getFirestore }       = require('firebase-admin/firestore');

initializeApp();

const deepseekApiKey = defineSecret('DEEPSEEK_API_KEY');

const RECEIPT_SYSTEM_PROMPT = `Você extrai dados de notas fiscais e cupons brasileiros.
Responda SOMENTE com JSON válido (sem markdown) neste formato:
{
  "establishment": "nome do estabelecimento ou string vazia",
  "date": "YYYY-MM-DD ou string vazia",
  "time": "HH:MM (24h) ou string vazia",
  "amountCents": número inteiro em centavos (ex: 2549 para R$ 25,49) ou 0,
  "paymentMethod": "pix" | "dinheiro" | "debito" | "credito" | "credito_parcelado" | "",
  "installments": número inteiro de parcelas (1 se à vista),
  "category": "food" | "shopping" | "transport" | "subscriptions" | "services" | "other" | ""
}
Use string vazia ou 0 quando não encontrar. paymentMethod deve ser uma das chaves listadas.`;

function emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._]/g, '_');
}

function parseDeepSeekJson(content) {
  if (!content) return null;
  var text = String(content).trim();
  var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function normalizeParsed(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var pay = String(raw.paymentMethod || '').toLowerCase();
  var validPay = ['pix', 'dinheiro', 'debito', 'credito', 'credito_parcelado'];
  if (validPay.indexOf(pay) === -1) pay = '';
  var inst = Math.max(1, Math.round(Number(raw.installments) || 1));
  if (pay !== 'credito_parcelado') inst = 1;
  var cents = Math.max(0, Math.round(Number(raw.amountCents) || 0));
  var cats = ['food', 'shopping', 'transport', 'subscriptions', 'services', 'other'];
  var cat = String(raw.category || '').toLowerCase();
  if (cats.indexOf(cat) === -1) cat = '';
  return {
    establishment: String(raw.establishment || '').trim(),
    date: String(raw.date || '').trim(),
    time: String(raw.time || '').trim(),
    amountCents: cents,
    paymentMethod: pay,
    installments: inst,
    category: cat,
  };
}

async function callDeepSeek(apiKey, ocrText, imageBase64) {
  var userContent;
  if (imageBase64) {
    userContent = [
      { type: 'text', text: 'Extraia os dados desta nota fiscal/cupom brasileiro.\nTexto OCR auxiliar:\n' + (ocrText || '(vazio)') },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64 } },
    ];
  } else {
    userContent = 'Extraia os dados desta nota fiscal/cupom brasileiro:\n\n' + (ocrText || '');
  }

  var res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: RECEIPT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    var errBody = await res.text().catch(function () { return ''; });
    throw new Error('deepseek_http_' + res.status + ': ' + errBody.slice(0, 200));
  }

  var data = await res.json();
  var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return normalizeParsed(parseDeepSeekJson(content));
}

exports.analyzeReceipt = onCall(
  { region: 'southamerica-east1', secrets: [deepseekApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'auth_required');
    }

    const { ocrText, imageBase64 } = request.data || {};
    const apiKey = deepseekApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'deepseek_not_configured');
    }

    try {
      const parsed = await callDeepSeek(apiKey, ocrText || '', imageBase64 || '');
      return parsed || {
        establishment: '',
        date: '',
        time: '',
        amountCents: 0,
        paymentMethod: '',
        installments: 1,
        category: '',
      };
    } catch (e) {
      console.error('[analyzeReceipt]', e.message || e);
      throw new HttpsError('internal', 'analyze_failed');
    }
  }
);

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
