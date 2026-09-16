// Stub de firebase-storage só para os testes de interface (sem rede).
export function getStorage() { return {}; }
export function ref() { return {}; }
export function uploadBytes() { return Promise.resolve(); }
export function getDownloadURL() { return Promise.resolve(''); }
