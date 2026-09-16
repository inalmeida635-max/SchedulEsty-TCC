// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * Configuração do Playwright para o SchedulEsty.
 * O app é um único arquivo estático (index.html), então os testes abrem
 * o arquivo direto via file:// — não precisa de servidor rodando.
 * Veja https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // A barra no final é importante: sem ela, um goto('index.html') vira
    // file:///index.html (raiz do sistema de arquivos) em vez do caminho do projeto.
    baseURL: 'file://' + path.join(__dirname) + '/',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Em alguns ambientes (ex.: sandbox de desenvolvimento) já existe um
        // Chromium instalado fora do cache padrão do Playwright; se o caminho
        // abaixo existir, ele é usado em vez de baixar um novo navegador.
        ...(require('fs').existsSync('/opt/pw-browsers/chromium')
          ? { launchOptions: { executablePath: '/opt/pw-browsers/chromium' } }
          : {}),
      },
    },
  ],
});
