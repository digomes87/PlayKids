import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * E2E contra o build de produção (`vite preview`), nos dois alvos do protótipo:
 * Safari no iPad (WebKit) e Chrome em tablet Android (Chromium), sempre em paisagem.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/PlayKids/`,
    trace: 'retain-on-failure',
    // Requisições atendidas pelo service worker escapam do page.route(): sem isto, os
    // testes que trocam o capítulo por um curto recebiam o capítulo real do cache.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'android-tablet',
      use: {
        ...devices['Galaxy Tab S9 landscape'],
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
      },
    },
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/PlayKids/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_BASE: '/PlayKids/' },
  },
});
