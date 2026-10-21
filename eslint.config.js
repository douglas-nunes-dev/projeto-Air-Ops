import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'supabase/functions']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Regra 1 da seção 7: Supabase só dentro de src/data/supabase/.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/supabase/**', 'src/data/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Use os services. Supabase só em src/data/supabase/.',
            },
          ],
          patterns: [
            {
              group: ['**/data/supabase/*', '@/data/supabase/*'],
              message: 'Importe de @/data, não da implementação.',
            },
          ],
        },
      ],
    },
  },
  // Componentes do shadcn e utilitários de teste exportam outras coisas junto com componentes.
  {
    files: ['src/components/ui/**/*.tsx', 'src/test/**/*.tsx', 'src/**/*.test.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  prettier,
]);
