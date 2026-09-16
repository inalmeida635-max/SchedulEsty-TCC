// Stub de firebase-firestore só para os testes de interface (sem rede).
export function getFirestore() { return {}; }
export function collection() { return {}; }
export function doc() { return {}; }
export function addDoc() { return Promise.resolve({ id: 'stub' }); }
export function setDoc() { return Promise.resolve(); }
export function updateDoc() { return Promise.resolve(); }
export function deleteDoc() { return Promise.resolve(); }
export function getDoc() { return Promise.resolve({ exists: () => false, data: () => undefined }); }
export function getDocs() { return Promise.resolve({ docs: [], forEach() {} }); }
export function query() { return {}; }
export function where() { return {}; }
export function orderBy() { return {}; }
export function onSnapshot(_ref, callback) {
  if (typeof callback === 'function') callback({ docs: [], forEach() {} });
  return () => {};
}
export function serverTimestamp() { return null; }
export const Timestamp = { now: () => ({ seconds: 0, nanoseconds: 0 }) };
export function increment(n) { return n; }
