# AirOps

Gestão inteligente de manutenção para prestadores de ar-condicionado e refrigeração.

A referência completa do projeto (escopo, arquitetura, regras obrigatórias, modelo de dados e segurança) está em [projeto.md](projeto.md).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o app em modo desenvolvimento |
| `npm run build` | Verifica os tipos e gera a versão de produção |
| `npm run lint` | ESLint (inclui a regra que bloqueia Supabase fora de `src/data/supabase/`) |
| `npm run format` | Formata o código com Prettier |
| `npm run test` | Roda todos os testes (Vitest): telas e regras de acesso do banco |
| `npm run test:banco` | Só as migrations e o RLS, num Postgres em memória (sem Docker) |

## Configuração local

1. Node 24 (veja `.nvmrc`; o `npm` recusa outras versões).
2. `npm ci`
3. Copie `.env.example` para `.env.local` e preencha com os dados do projeto no Supabase (sem ele, o app abre mas o login avisa que falta configuração).
