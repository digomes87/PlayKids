import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serve o site em /<nome-do-repo>/. O workflow de deploy injeta VITE_BASE.
const base = process.env.VITE_BASE ?? '/PlayKids/';

const MAX_PRECACHE_FILE_BYTES = 8 * 1024 * 1024;

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // O registro fica em src/app/serviceWorker.ts: procura versão nova ao voltar
      // para o app e só recarrega fora da partida.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'PlayKids — Matemática no Ritmo',
        short_name: 'PlayKids',
        description: 'Jogo musical de matemática para crianças.',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#fbf3df',
        theme_color: '#ffcf3f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo o conteúdo (JSON, áudio, imagens) entra no precache: offline após o primeiro acesso.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,wav,mp3,ogg,m4a}'],
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_FILE_BYTES,
        // A versão nova assume as abas abertas na hora; o recarregamento fica com serviceWorker.ts.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
