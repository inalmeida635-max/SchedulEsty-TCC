// Testes de "fumaça": não dependem de rede/Firebase, só verificam que a
// interface (HTML/CSS/JS) está correta — carregam o index.html localmente,
// com o SDK do Firebase trocado por um stub (veja tests/helpers/mock-firebase.js).
//
// Esta versão do app é uma SPA com roteamento por hash (#/entrar-cliente,
// #/cadastro/cliente, etc.), tudo desenhado dentro de <div id="app">
// pelas funções renderEscolha()/renderLogin()/renderCadastro()/... —
// não existem mais os ids fixos #screen-login/#login-email/#btn-login.
const { test, expect } = require('@playwright/test');
const { mockFirebase } = require('./helpers/mock-firebase');

test.beforeEach(async ({ page }) => {
  await mockFirebase(page);
});

test.describe('Tela inicial', () => {
  test('carrega e mostra a tela de escolha (cliente/profissional)', async ({ page }) => {
    await page.goto('index.html');
    await expect(page).toHaveTitle(/SchedulEsty/i);
    await expect(page.getByText('Como você quer entrar?')).toBeVisible();
    await expect(page.locator('.cartao-tipo', { hasText: 'Sou cliente' })).toBeVisible();
    await expect(page.locator('.cartao-tipo', { hasText: 'Sou profissional' })).toBeVisible();
  });

  test('não mostra tela em branco (#app tem conteúdo)', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('#app')).toBeVisible();
    const html = await page.locator('#app').innerHTML();
    expect(html.trim().length).toBeGreaterThan(0);
  });
});

test.describe('Navegação entre telas de autenticação', () => {
  test('"Sou cliente" leva ao login de cliente', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('.cartao-tipo', { hasText: 'Sou cliente' }).click();
    await expect(page).toHaveURL(/#\/entrar-cliente$/);
    await expect(page.getByRole('heading', { name: 'Entrar como cliente' })).toBeVisible();
    await expect(page.locator('form[data-form="login"] input[name="email"]')).toBeVisible();
    await expect(page.locator('form[data-form="login"] input[name="senha"]')).toBeVisible();
  });

  test('"Sou profissional" leva ao login de profissional', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('.cartao-tipo', { hasText: 'Sou profissional' }).click();
    await expect(page).toHaveURL(/#\/entrar-admin$/);
    await expect(page.getByRole('heading', { name: 'Entrar como profissional' })).toBeVisible();
  });

  test('"Cadastre-se como cliente" leva ao formulário de cadastro', async ({ page }) => {
    await page.goto('index.html');
    await page.getByRole('link', { name: 'Cadastre-se como cliente' }).click();
    await expect(page).toHaveURL(/#\/cadastro\/cliente$/);
    await expect(page.locator('form[data-form="cadastro"] input[name="nome"]')).toBeVisible();
    await expect(page.locator('form[data-form="cadastro"] input[name="email"]')).toBeVisible();
    await expect(page.locator('form[data-form="cadastro"] input[name="telefone"]')).toBeVisible();
    await expect(page.locator('form[data-form="cadastro"] input[name="senha"]')).toBeVisible();
    await expect(page.locator('form[data-form="cadastro"] input[name="confirmarSenha"]')).toBeVisible();
  });

  test('cadastro de profissional mostra campo de especialidade (não telefone)', async ({ page }) => {
    await page.goto('index.html#/cadastro/admin');
    await expect(page.locator('form[data-form="cadastro"] input[name="especialidade"]')).toBeVisible();
    await expect(page.locator('form[data-form="cadastro"] input[name="telefone"]')).toHaveCount(0);
  });

  test('"Esqueci minha senha" leva à tela de recuperação', async ({ page }) => {
    await page.goto('index.html');
    await page.locator('.cartao-tipo', { hasText: 'Sou cliente' }).click();
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
    await expect(page).toHaveURL(/#\/recuperar-senha$/);
    await expect(page.locator('form[data-form="recuperar-senha"] input[name="email"]')).toBeVisible();
  });

  test('"← Voltar" retorna para a tela de escolha', async ({ page }) => {
    await page.goto('index.html#/entrar-cliente');
    await page.getByRole('link', { name: '← Voltar' }).click();
    await expect(page.getByText('Como você quer entrar?')).toBeVisible();
  });
});

test.describe('Fluxo de cadastro', () => {
  test('senhas diferentes são rejeitadas com mensagem de erro (sem chamar a rede)', async ({ page }) => {
    await page.goto('index.html#/cadastro/cliente');
    await page.locator('input[name="nome"]').fill('Maria');
    await page.locator('input[name="email"]').fill('maria@teste.com');
    await page.locator('input[name="senha"]').fill('123456');
    await page.locator('input[name="confirmarSenha"]').fill('654321');
    await page.locator('form[data-form="cadastro"] button[type="submit"]').click();
    await expect(page.locator('#erro-cadastro')).toContainText(/não coincidem/i);
    // não deve ter navegado de tela
    await expect(page).toHaveURL(/#\/cadastro\/cliente$/);
  });

  test('cadastro com senhas iguais tenta o Firebase e mostra erro amigável (sem rede real nos testes de fumaça)', async ({ page }) => {
    await page.goto('index.html#/cadastro/cliente');
    await page.locator('input[name="nome"]').fill('Maria');
    await page.locator('input[name="email"]').fill('maria@teste.com');
    await page.locator('input[name="senha"]').fill('123456');
    await page.locator('input[name="confirmarSenha"]').fill('123456');
    await page.locator('form[data-form="cadastro"] button[type="submit"]').click();
    // O stub de firebase-auth.js rejeita createUserWithEmailAndPassword propositalmente;
    // o importante aqui é confirmar que o app trata o erro sem quebrar a página.
    await expect(page.locator('#erro-cadastro .erro-form')).toBeVisible();
  });
});

test.describe('Validação de login (sem rede)', () => {
  test('login com campos vazios não avança de tela (validação nativa do formulário)', async ({ page }) => {
    await page.goto('index.html#/entrar-cliente');
    await page.locator('form[data-form="login"] button[type="submit"]').click();
    // Os campos são "required": o navegador bloqueia o submit, então a URL/tela não muda.
    await expect(page).toHaveURL(/#\/entrar-cliente$/);
    await expect(page.getByRole('heading', { name: 'Entrar como cliente' })).toBeVisible();
  });

  test('login com credenciais que o Firebase rejeita mostra mensagem de erro', async ({ page }) => {
    await page.goto('index.html#/entrar-cliente');
    await page.locator('form[data-form="login"] input[name="email"]').fill('teste@exemplo.com');
    await page.locator('form[data-form="login"] input[name="senha"]').fill('123456');
    await page.locator('form[data-form="login"] button[type="submit"]').click();
    await expect(page.locator('#erro-login .erro-form')).toBeVisible();
  });
});
