// Stub de firebase-auth só para os testes de interface (sem rede).
export function getAuth() {
  return {};
}
export function onAuthStateChanged(auth, callback) {
  // Simula "ninguém logado" assim que o app inicia, pra tela de escolha
  // (login/cadastro) aparecer imediatamente, sem esperar rede nenhuma.
  callback(null);
  return () => {};
}
export function createUserWithEmailAndPassword() {
  return Promise.reject(new Error('stub: sem rede nos testes de fumaça'));
}
export function signInWithEmailAndPassword() {
  return Promise.reject(new Error('stub: sem rede nos testes de fumaça'));
}
export function signOut() {
  return Promise.resolve();
}
export function sendPasswordResetEmail() {
  return Promise.reject(new Error('stub: sem rede nos testes de fumaça'));
}
export function updatePassword() {
  return Promise.reject(new Error('stub: sem rede nos testes de fumaça'));
}
export function reauthenticateWithCredential() {
  return Promise.reject(new Error('stub: sem rede nos testes de fumaça'));
}
export const EmailAuthProvider = {
  credential: () => ({}),
};
