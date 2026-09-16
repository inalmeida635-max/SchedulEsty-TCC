// Intercepta os imports do SDK do Firebase (carregados via CDN no
// index.html) e devolve versões "stub" (sem rede), definidas em
// tests/stubs/. Usado só pelos testes de fumaça (tests/smoke.spec.js),
// que testam apenas a interface — não o comportamento real do Firebase.
//
// Os testes de login de verdade (tests/auth.spec.js) NÃO usam isso: eles
// precisam da rede real pra validar o Firebase Authentication de verdade.
const path = require('path');

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';

const STUBS = {
  'firebase-app.js': path.join(__dirname, '..', 'stubs', 'firebase-app.js'),
  'firebase-auth.js': path.join(__dirname, '..', 'stubs', 'firebase-auth.js'),
  'firebase-firestore.js': path.join(__dirname, '..', 'stubs', 'firebase-firestore.js'),
  'firebase-storage.js': path.join(__dirname, '..', 'stubs', 'firebase-storage.js'),
};

async function mockFirebase(page) {
  for (const [file, stubPath] of Object.entries(STUBS)) {
    await page.route(SDK_BASE + file, (route) =>
      route.fulfill({ path: stubPath, contentType: 'application/javascript' })
    );
  }
}

module.exports = { mockFirebase };
