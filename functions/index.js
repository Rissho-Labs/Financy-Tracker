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

const RECEIPT_SYSTEM_PROMPT = `Você extrai dados de documentos de gasto brasileiros: notas fiscais, cupons, boletos, contas (água, luz), DAS MEI, DARF, GPS, guias do Simples Nacional e comprovantes tributários.
Responda SOMENTE com JSON válido (sem markdown):
{
  "isValidReceipt": true ou false,
  "establishment": "nome ou DAS MEI / Simples Nacional",
  "date": "YYYY-MM-DD ou vazio",
  "time": "HH:MM ou vazio",
  "amountCents": inteiro em centavos (7590 = R$ 75,90),
  "paymentMethod": "pix" | "dinheiro" | "debito" | "credito" | "credito_parcelado" | "",
  "installments": 1,
  "category": "food" | "shopping" | "transport" | "subscriptions" | "services" | "other" | ""
}
DAS MEI e guias tributárias são isValidReceipt:true, category services. isValidReceipt:false só para imagens que não são documento financeiro.`;

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
    isValidReceipt: raw.isValidReceipt !== false,
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
      { type: 'text', text: 'Extraia os dados deste documento (nota, boleto, DAS MEI, conta ou comprovante).\nTexto OCR auxiliar:\n' + (ocrText || '(vazio)') },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64 } },
    ];
  } else {
    userContent = 'Extraia os dados deste documento de gasto brasileiro (pode ser DAS MEI, boleto ou nota):\n\n' + (ocrText || '');
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

/** Credenciais EmailJS (já públicas no cliente) — e-mail branded, não o noreply do Firebase. */
const EMAILJS = {
  serviceId: 'service_3qhxn9s',
  templateId: 'template_xwhxiuw',
  publicKey: 'A3HBL2otv1HGPSwZS',
};

const RESET_CONTINUE_URL =
  'https://financy-4d5f7.web.app/features/auth/reset-password.html';

async function sendEmailJs(templateParams) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templateId,
      user_id: EMAILJS.publicKey,
      template_params: templateParams,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('emailjs_http_' + res.status + ': ' + String(text).slice(0, 200));
  }
}

/**
 * Redefinição branded: gera link Firebase (Admin) e envia pelo EmailJS
 * (remetente do serviço EmailJS — bem menos spam que noreply@firebase).
 * Template EmailJS deve incluir {{reset_link}} e/ou {{message}} + {{to_email}}.
 */
exports.sendBrandedPasswordReset = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const mail = String((request.data && request.data.email) || '')
      .trim()
      .toLowerCase();
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      throw new HttpsError('invalid-argument', 'invalid_email');
    }

    let resetLink;
    try {
      resetLink = await getAuth().generatePasswordResetLink(mail, {
        url: RESET_CONTINUE_URL,
        handleCodeInApp: false,
      });
    } catch (e) {
      // Não revelar se a conta existe
      if (e && e.code === 'auth/user-not-found') {
        return { ok: true, sent: false };
      }
      console.error('[sendBrandedPasswordReset] link', e);
      throw new HttpsError('internal', 'link_failed');
    }

    try {
      await sendEmailJs({
        to_email: mail,
        email: mail,
        user_email: mail,
        app_name: 'Finance Tracker',
        reset_link: resetLink,
        link: resetLink,
        action_url: resetLink,
        message:
          'Recebemos um pedido para redefinir a senha da sua conta Finance Tracker. ' +
          'Abra o link abaixo (válido por tempo limitado):\n\n' +
          resetLink,
        // Compatível com template antigo de OTP
        code: 'LINK',
        expiry: '1 hora',
      });
    } catch (e) {
      console.error('[sendBrandedPasswordReset] emailjs', e.message || e);
      throw new HttpsError('internal', 'emailjs_failed');
    }

    return { ok: true, sent: true };
  }
);

/**
 * OTP branded via EmailJS (código nunca volta ao cliente).
 * Template: {{to_email}}, {{code}}, {{app_name}}, {{expiry}}.
 */
exports.sendPasswordResetOtp = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const mail = String((request.data && request.data.email) || '')
      .trim()
      .toLowerCase();
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      throw new HttpsError('invalid-argument', 'invalid_email');
    }

    try {
      await getAuth().getUserByEmail(mail);
    } catch (e) {
      if (e && e.code === 'auth/user-not-found') {
        return { ok: true, sent: false };
      }
      throw new HttpsError('internal', 'lookup_failed');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const key = emailKey(mail);
    const db = getFirestore();
    await db.doc(`passwordResetCodes/${key}`).set({
      email: mail,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      used: false,
      createdAt: new Date(),
    });

    try {
      await sendEmailJs({
        to_email: mail,
        email: mail,
        user_email: mail,
        app_name: 'Finance Tracker',
        code,
        passcode: code,
        reset_code: code,
        expiry: '10 minutos',
        message:
          'O seu código Finance Tracker para redefinir a senha é: ' +
          code +
          ' (válido por 10 minutos).',
      });
    } catch (e) {
      console.error('[sendPasswordResetOtp] emailjs', e.message || e);
      throw new HttpsError('internal', 'emailjs_failed');
    }

    return { ok: true, sent: true };
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
