// Substituto (stub) do SDK do Firebase, usado só nos testes "de fumaça"
// (tests/smoke.spec.js), que não precisam de rede de verdade — eles só
// verificam a interface. Veja tests/helpers/mock-firebase.js.
export function initializeApp() {
  return {};
}
