// ==========================================================
// JAVASCRIPT — COMPORTAMENTO DO SITE
// Aqui ficam eventos, funções, validações e interações.
// ==========================================================
/*
FIREBASE SETUP
1. Crie um projeto no Firebase Console.
2. Ative Authentication (Email/Password) e Firestore Database.
3. Substitua firebaseConfig pelos dados do seu projeto.
4. Este projeto usa Firebase modular via CDN.
*/
const firebaseConfig = {
  apiKey: "COLOQUE_SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.firebasestorage.app",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
}
;
const FIREBASE_ENABLED = false;
// altere para true depois de configurar o projeto
async function firebaseInit() {
  if (!FIREBASE_ENABLED) return null;
  const {
    initializeApp
  }
  = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
  const app = initializeApp(firebaseConfig);
  const {
    getFirestore
  }
  = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  const {
    getAuth
  }
  = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
  return {
    app, db: getFirestore(app), auth: getAuth(app)
  }
  ;
}
window.firebaseInit = firebaseInit;
window.firebaseConfig = firebaseConfig;
