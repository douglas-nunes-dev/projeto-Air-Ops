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
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'AirOps — Gestão Inteligente de Manutenção',
        short_name: 'AirOps',
        description: 'Gestão de manutenção de ar-condicionado e refrigeração',
        lang: 'pt-BR',
        theme_color: '#0b3fd6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // Gerados a partir de docs/imagens/logo-identidade-visual.png.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        // Migrations e regras de acesso (RLS) num Postgres em memória (PGlite).
        test: {
          name: 'banco',
          include: ['supabase/tests/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
