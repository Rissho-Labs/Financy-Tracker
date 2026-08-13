/**
 * Firebase — app Web (projeto Financy).
 * Console: Configurações do projeto → Seus apps → Web
 */
window.FTFIREBASE_CONFIG = {
  apiKey: 'AIzaSyB9thbRS6i4KQ7U0kdTRZQG9QbzF04QQmw',
  authDomain: 'financy-4d5f7.firebaseapp.com',
  projectId: 'financy-4d5f7',
  storageBucket: 'financy-4d5f7.firebasestorage.app',
  messagingSenderId: '934366617514',
  appId: '1:934366617514:web:da61a56134cca87fd395d3',
  measurementId: 'G-NK7JC0G5DY',
  /** Firebase Console → Authentication → Google → ID do cliente Web (obrigatório no celular) */
  googleWebClientId: '934366617514-lh5b8u1hk22ug9i82q5ssc6j3ivbr96j.apps.googleusercontent.com',

  /**
   * EmailJS — e-mail branded de redefinição (menos spam que noreply do Firebase).
   * Template recomendado: variáveis to_email, code (OTP) e/ou reset_link + message.
   * Serviço deve usar Gmail/Outlook/domínio próprio verificado no painel EmailJS.
   *
   * Sem EmailJS (ou se falhar), a app tenta Cloud Functions e por fim o e-mail Auth do Firebase.
   */
  emailjsServiceId:  'service_3qhxn9s',
  emailjsTemplateId: 'template_xwhxiuw',
  emailjsPublicKey:  'A3HBL2otv1HGPSwZS',
};
