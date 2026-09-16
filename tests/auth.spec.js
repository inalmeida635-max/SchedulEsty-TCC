// Testes "de rede": entram de verdade no Firebase (Authentication + Firestore).
// Precisam de uma conta de teste já existente no projeto Firebase.
//
// Como configurar:
//   - Local: crie um arquivo ".env" (não é versionado) com:
//       TEST_CLIENTE_EMAIL=email-de-um-cliente-de-teste@exemplo.com
//       TEST_CLIENTE_SENHA=senha-desse-cliente
//     e rode os testes com: npx dotenv -e .env -- npx playwright test
//   - GitHub Actions: cadastre os mesmos dois valores em
//     Settings > Secrets and variables > Actions como TEST_CLIENTE_EMAIL e
//     TEST_CLIENTE_SENHA (veja o workflow em .github/workflows/tests.yml).
//
// Se as variáveis não estiverem definidas, estes testes são pulados
// automaticamente (não quebram o restante da suíte).
//
// Esta versão do app é uma SPA por hash: o login de cliente fica em
// #/entrar-cliente, com <form data-form="login"> (campos input[name=email]/
// input[name=senha], sem ids fixos). Depois de autenticado, o roteador troca
// a rota para #/c/inicio e desenha o layout do cliente (.layout-cliente).
const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_CLIENTE_EMAIL;
const SENHA = process.env.TEST_CLIENTE_SENHA;

test.describe('Login com Firebase (conta de teste real)', () => {
  test.skip(!EMAIL || !SENHA, 'TEST_CLIENTE_EMAIL / TEST_CLIENTE_SENHA não configurados');

  test('login com credenciais válidas entra na área logada', async ({ page }) => {
    await page.goto('index.html#/entrar-cliente');

    await page.locator('form[data-form="login"] input[name="email"]').fill(EMAIL);
    await page.locator('form[data-form="login"] input[name="senha"]').fill(SENHA);
    await page.locator('form[data-form="login"] button[type="submit"]').click();

    // Espera o Firebase Authentication responder e o roteador desenhar a área do cliente
    await expect(page.locator('.layout-cliente')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/#\/c\/inicio$/);
  });

  test('login com senha errada mostra mensagem de erro', async ({ page }) => {
    await page.goto('index.html#/entrar-cliente');

    await page.locator('form[data-form="login"] input[name="email"]').fill(EMAIL);
    await page.locator('form[data-form="login"] input[name="senha"]').fill('senha-propositalmente-errada-123');
    await page.locator('form[data-form="login"] button[type="submit"]').click();

    await expect(page.locator('#erro-login .erro-form')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.layout-cliente')).toHaveCount(0);
  });
});
