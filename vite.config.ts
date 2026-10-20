/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AirOps — Gestão Inteligente de Manutenção',
        short_name: 'AirOps',
        description: 'Gestão de manutenção de ar-condicionado e refrigeração',
        lang: 'pt-BR',
        theme_color: '#0b3fd6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // Ícones (192, 512 e maskable) entram quando o logo for exportado em arquivos separados.
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
