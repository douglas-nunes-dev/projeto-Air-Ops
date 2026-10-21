# AirOps — Gestão Inteligente de Manutenção

**AirOps** é o nome do sistema: uma plataforma web para prestadores de manutenção de **ar-condicionado e refrigeração**, começando por **Passos (MG) e região**.

Este arquivo é a referência do projeto: escopo, decisões de arquitetura, modelo de dados e regras de desenvolvimento. As regras de arquitetura (seção 7) são **obrigatórias** e existem para permitir a migração futura do Supabase para um backend em **Node.js** sem reescrever o sistema.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Fases do produto](#2-fases-do-produto)
3. [Escopo do MVP](#3-escopo-do-mvp)
4. [Fluxo da ordem de serviço](#4-fluxo-da-ordem-de-serviço)
5. [Perfis de usuário](#5-perfis-de-usuário)
6. [Telas do MVP](#6-telas-do-mvp)
7. [Arquitetura e regras para migração futura para Node](#7-arquitetura-e-regras-para-migração-futura-para-node)
8. [Stack de tecnologias](#8-stack-de-tecnologias)
9. [Estrutura de pastas](#9-estrutura-de-pastas)
10. [Modelo de dados](#10-modelo-de-dados)
11. [Segurança](#11-segurança)
12. [IA no MVP](#12-ia-no-mvp)
13. [Etapas de desenvolvimento](#13-etapas-de-desenvolvimento)
14. [Piloto](#14-piloto)
15. [Evolução para SaaS](#15-evolução-para-saas)
16. [Plano de migração para Node](#16-plano-de-migração-para-node)
17. [Decisões em aberto](#17-decisões-em-aberto)

---

## 1. Visão geral

O AirOps centraliza **clientes, locais, equipamentos, agenda, ordens de serviço (OS) e relatórios**, substituindo o controle espalhado em caderno, planilha e WhatsApp.

**Público inicial**

| Perfil | O que mais valoriza |
|---|---|
| Técnico autônomo | Simplicidade, relatório bonito para o cliente, lembrete de preventivas, preço baixo |
| Pequena empresa (2 a 10 técnicos) | Saber quem está onde, histórico dos equipamentos, padronizar o serviço |
| Prestador em ambiente de saúde (ex.: hospital) | Rastreabilidade, comprovação das rotinas, documentação para fiscalização |

**Por que ar-condicionado:** a Lei nº 13.589/2018 obriga estabelecimentos de uso público e coletivo com ambientes climatizados a manter um **PMOC** (Plano de Manutenção, Operação e Controle). Isso cria demanda por registro e comprovação das manutenções. O MVP não emite o PMOC formal, mas guarda as evidências: equipamentos, periodicidade, checklists, fotos, datas e assinaturas.

**Princípio central:** resolver muito bem o ciclo da ordem de serviço para um nicho e uma região antes de expandir.

---

## 2. Fases do produto

| Fase | O que é | Meta para avançar |
|---|---|---|
| **1. MVP** | Ciclo da OS completo, usado por um prestador piloto | O piloto usa no dia a dia e o relatório substitui o controle atual |
| **2. SaaS regional** | Assinatura para autônomos e pequenas empresas de Passos e região | 10 a 20 clientes pagantes com uso semanal recorrente |
| **3. SaaS em escala** | Recursos avançados e expansão para outras regiões e segmentos | Crescimento por indicação e venda online com suporte sustentável |

> O MVP já nasce com a **base de um SaaS** (várias empresas isoladas no mesmo sistema). O que se corta são funcionalidades, não a fundação.

---

## 3. Escopo do MVP

### Dentro do MVP

| Prioridade | Módulo | O que faz |
|---|---|---|
| Essencial | Acesso e organização | Login, recuperação de senha, empresa, usuários, papéis e isolamento por empresa |
| Essencial | Clientes e locais | Clientes, endereços, unidades e setores atendidos |
| Essencial | Equipamentos | Identificação, local, marca/modelo, capacidade, número de série e histórico |
| Essencial | Ordens de serviço | Abrir, priorizar, agendar, atribuir, executar, pausar, cancelar e concluir |
| Essencial | Execução no celular | Diagnóstico, checklist, atividades, tempo e fotos com envio tolerante a sinal ruim |
| Essencial | Conclusão | Assinatura do cliente na tela, revisão e relatório em PDF |
| Básico | Agenda | Visão diária e semanal por técnico |
| Básico | Preventiva simples | Periodicidade no equipamento e lista de manutenções vencendo |
| Básico | IA mínima | Colar uma mensagem (ex.: WhatsApp) e receber um rascunho de OS para revisar |

### Fora do MVP

- Portal do cliente, contratos, orçamentos, estoque, financeiro e emissão fiscal
- Registro por voz e redação automática de relatórios pela IA
- Aplicativo nativo e funcionamento offline completo (começar com web responsiva + PWA)
- IA tomando decisões técnicas ou fechando OS sem revisão humana
- Seleção de várias empresas no login (a tabela suporta; a tela fica para depois)
- Tela de administração da plataforma (administrar pelo painel do Supabase)

### Simplificações conscientes

| Plano completo | No MVP |
|---|---|
| Tabela `tecnicos` separada | Técnico = usuário com papel `tecnico` |
| Contratos e planos de manutenção | Periodicidade no próprio equipamento |
| Materiais estruturados | Campo de texto livre na execução |

---

## 4. Fluxo da ordem de serviço

A OS pode nascer de três portas: **abertura manual**, **mensagem convertida pela IA** ou **preventiva vencendo**.

| Etapa | Status | Quem faz | Onde |
|---|---|---|---|
| 1. Abrir: cliente, local, equipamento(s), problema, prioridade | `aberta` | Atendente ou gestor | Escritório |
| 2. Planejar: data, horário, técnico | `agendada` | Gestor | Escritório |
| 3. Executar: diagnóstico, checklist, atividades, tempo, fotos | `em_execucao` | Técnico | Campo (celular) |
| 4. Concluir: assinatura, revisão, encerramento, PDF | `concluida` | Técnico e gestor | Campo e escritório |
| 5. Consultar histórico do equipamento e do cliente | — | Todos | Ambos |

### Desvios

- **Reagendar:** técnico não foi ou cliente ausente → volta para `agendada`
- **Pausar:** aguardando peça ou aprovação → `pausada`
- **Cancelar:** de qualquer etapa, com motivo obrigatório → `cancelada`
- **Retorno:** o serviço não resolveu → nova OS vinculada à anterior (`os_origem_id`)

### Transições permitidas

```
aberta       → agendada | cancelada
agendada     → em_execucao | agendada (reagendar) | cancelada
em_execucao  → pausada | concluida | cancelada
pausada      → em_execucao | agendada | cancelada
concluida    → (final)
cancelada    → (final)
```

> As transições ficam em `src/domain/ordem/transicoes.ts`, em TypeScript puro, e **toda mudança de status gera um registro em `ordem_servico_eventos`**.

---

## 5. Perfis de usuário

| Papel | Código | O que faz |
|---|---|---|
| Administrador da prestadora | `admin` | Configura a conta, usuários, clientes e modelos de checklist |
| Gestor operacional | `gestor` | Abre e agenda OS, atribui técnicos, revisa e encerra |
| Técnico | `tecnico` | Vê as OS atribuídas a ele e registra execução, fotos e assinatura |

- Uma pessoa pode ter **mais de um papel**.
- **Modo autônomo:** uma única pessoa acumula os três papéis, com telas simplificadas e sem etapas de aprovação.
- Cliente da prestadora (portal) e administrador da plataforma ficam para a fase SaaS.

---

## 6. Telas do MVP

| # | Tela | Conteúdo |
|---|---|---|
| 1 | Login | Acesso e recuperação de senha |
| 2 | Painel | OS abertas e atrasadas, agenda do dia e preventivas vencendo (listas simples) |
| 3 | Clientes e locais | Busca, contatos, endereços e setores |
| 4 | Equipamentos | Dados técnicos, local, periodicidade e linha do tempo de atendimentos |
| 5 | Ordens de serviço | Lista com filtros por status, técnico e data |
| 6 | Abertura de OS | Formulário manual ou mensagem colada para a IA preencher |
| 7 | Agenda | Visão diária e semanal por técnico |
| 8 | Tela do técnico | Celular: execução, checklist, fotos e assinatura |
| 9 | Relatório | Prévia, revisão e exportação em PDF |

> A **tela do técnico** é pensada para celular desde o início (mobile-first), não apenas "responsiva".

### Layout e bibliotecas de interface

| Uso | Biblioteca | Observação |
|---|---|---|
| Estilo | Tailwind CSS | |
| Componentes | **shadcn/ui** (sobre Radix UI, estilo **Vega**) | Código dos componentes fica no projeto (`src/components/ui/`); só visual, sem Supabase. Formulários usam o componente `field` com React Hook Form |
| Ícones | lucide-react | |
| Tabelas e listas | TanStack Table v9 | Busca sem acentos, ordenação e paginação no navegador (`src/components/tabela/`). No v9 cada recurso é registrado explicitamente |
| Datas | date-fns (pt-BR) + calendário do shadcn | |
| Agenda | FullCalendar v7 (`@fullcalendar/react`, versão gratuita) | Visões diária e semanal, arrastar para reagendar. Plugins importados de `@fullcalendar/react/timegrid` etc. |
| Avisos | sonner | |
| Gráficos (fase 2) | Recharts via shadcn charts | |
| Fonte | Inter (`@fontsource-variable/inter`) | |
| Campos de seleção | `<select>` nativo com o visual do shadcn | No celular abre o seletor do próprio aparelho, mais fácil de usar com o dedo |
| Cores | Azul da marca (`--primary`) e menu lateral azul-escuro | Definidas em `src/index.css` |

**Escritório (desktop) — admin e gestor**
- Menu lateral: Painel, Ordens, Agenda, Clientes, Equipamentos, Configurações
- Rodapé do menu: saudação conforme a hora ("Bom dia", "Boa tarde", "Boa noite") com o primeiro nome de quem entrou, relógio e clima atual da cidade onde está o computador (se o navegador não informar a localização, usa Passos/MG)
- Barra superior: busca, botão "Nova OS" e menu do usuário

**Técnico (celular)**
- Menu inferior: Hoje, Minhas OS, Perfil
- Botões grandes, poucos campos por tela, câmera a um toque
- Tela inicial: "Minhas OS de hoje", em ordem de horário

**Modo autônomo:** layout do escritório no computador e do técnico no celular.

### Painel operacional (MVP)

- **Cartões de resumo:** OS em andamento, OS atrasadas (vermelho), atendimentos de hoje, OS urgentes, clientes e equipamentos; preventivas vencendo em 30 dias chegam na etapa 8. Clicar abre a lista já filtrada (ou a agenda do dia).
- **Agenda de hoje:** atendimentos do dia em ordem de horário, com técnico e status; horário em vermelho quando atrasado.
- **Preventivas vencendo**, com botão "Gerar OS" (etapa 8).

**Dashboard com gráficos fica para a fase 2:** OS por mês, tempo médio de atendimento, ranking de clientes, rentabilidade.

---

## 7. Arquitetura e regras para migração futura para Node

### Ideia central

O Supabase é um **detalhe de implementação**, escondido atrás de interfaces que o projeto controla. No dia da migração, troca-se a implementação da camada de dados, e o resto do sistema não muda.

```
Telas (pages/components)
        │  chamam apenas
        ▼
Services (services/)            ← o que as telas usam: criarOrdem(), listarOrdens()...
        │  dependem apenas de
        ▼
Interfaces (data/repositories/) ← contratos: OrdemRepository, ClienteRepository...
        │  implementadas por
        ▼
┌───────────────────────┬──────────────────────────┐
│ data/supabase/ (hoje) │ data/api/ (futuro: Node) │
└───────────────────────┴──────────────────────────┘
```

### Regras obrigatórias

1. **Proibido usar `supabase.from(...)`, `supabase.auth` ou `supabase.storage` fora de `src/data/supabase/`.**
   As telas, hooks e services nunca importam o cliente do Supabase.
2. **Telas só falam com `services`.** Componentes e hooks chamam funções como `listarOrdens()`, nunca repositórios diretamente.
3. **Services dependem de interfaces**, não de implementações. Ex.: `OrdemRepository`, e não `SupabaseOrdemRepository`.
4. **Tipos próprios do domínio.** `Ordem`, `Cliente`, `Equipamento` etc. ficam em `src/domain/`, validados com **Zod**. Os tipos gerados pelo Supabase só existem dentro de `src/data/supabase/` e são convertidos por funções `mapear...()`.
5. **Autenticação e arquivos também embrulhados:** `authService` e `storageService`.
6. **Regra de negócio em TypeScript puro**, sem dependência de Supabase nem de React: transições de status, cálculo da próxima preventiva, validações, montagem do prompt da IA. Esse código roda igual numa Edge Function ou no Node.
7. **Um único ponto de composição:** `src/data/index.ts` decide qual implementação usar. Trocar de Supabase para API Node = mudar esse arquivo.
8. **Banco versionado em migrations SQL** (Supabase CLI), nunca alterado só pelo painel.
9. **No banco, salvar o caminho do arquivo, nunca a URL completa.** Ex.: `org-12/os-345/foto1.jpg`.
10. **Edge Functions finas:** apenas recebem a requisição, validam e chamam funções do `domain`. Assim viram rotas Node com pouco esforço.
11. **Não depender de recursos exclusivos do Supabase** sem embrulhá-los (ex.: Realtime, se usado, fica atrás de uma interface).
12. **Evitar lógica de negócio complexa em funções SQL.** RLS e constraints sim; regras de negócio ficam em TypeScript. Operações sensíveis (ex.: mudança de status) rodam numa Edge Function que reutiliza o `domain` (ver seção 11).
13. **TypeScript limpo e fácil de entender.** O código deve ser lido por qualquer pessoa do projeto sem esforço:
   - `strict: true` no `tsconfig`; proibido `any` (usar `unknown` + validação com Zod quando o tipo for incerto).
   - Nomes claros e em português para o domínio (`concluirOrdem`, `proximaManutencao`), sem abreviações obscuras.
   - Funções pequenas, com uma única responsabilidade e retorno antecipado (`if (!ordem) throw ...`) em vez de `if` aninhados.
   - Preferir código simples e explícito a soluções "espertas"; evitar tipos genéricos complexos quando um tipo direto resolve.
   - Comentários só para explicar o **porquê** de uma decisão, não o que o código já mostra.
   - Formatação automática com **Prettier** e regras do **ESLint** (`typescript-eslint`) verificadas antes de cada commit.

### Erros

- As telas tratam só erros do domínio: `ErroAutenticacao` (login) e `ErroDados` (leitura e gravação), em `src/domain/`.
- A camada `data/supabase/` converte os erros do Supabase/Postgres nesses tipos, com mensagem em português (ex.: CNPJ repetido → "Já existe um cliente com este CPF/CNPJ.", indicando o campo do formulário).
- Na migração para Node, a implementação `data/api/` faz a mesma conversão; as telas não mudam.

### Exemplo

```ts
// src/domain/ordem/tipos.ts
import { z } from 'zod';

export const StatusOrdem = z.enum([
  'aberta', 'agendada', 'em_execucao', 'pausada', 'concluida', 'cancelada',
]);

export const OrdemSchema = z.object({
  id: z.string().uuid(),
  organizacaoId: z.string().uuid(),
  clienteId: z.string().uuid(),
  localId: z.string().uuid(),
  problema: z.string().min(3),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  status: StatusOrdem,
  tecnicoId: z.string().uuid().nullable(),
  agendadaPara: z.coerce.date().nullable(),
});

export type Ordem = z.infer<typeof OrdemSchema>;
```

```ts
// src/data/repositories/OrdemRepository.ts
import type { Ordem, NovaOrdem, FiltroOrdens } from '@/domain/ordem/tipos';

export interface OrdemRepository {
  listar(filtro: FiltroOrdens): Promise<Ordem[]>;
  buscarPorId(id: string): Promise<Ordem | null>;
  criar(dados: NovaOrdem): Promise<Ordem>;
  alterarStatus(id: string, novoStatus: Ordem['status'], motivo?: string): Promise<Ordem>;
}
```

```ts
// src/data/supabase/SupabaseOrdemRepository.ts
import { supabase } from './client';
import type { OrdemRepository } from '../repositories/OrdemRepository';
import { mapearOrdem } from './mapeadores';

export class SupabaseOrdemRepository implements OrdemRepository {
  async listar(filtro: FiltroOrdens) {
    let query = supabase.from('ordens_servico').select('*');
    if (filtro.status) query = query.eq('status', filtro.status);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapearOrdem); // converte para o tipo do domínio
  }
  // ...
}
```

```ts
// src/data/index.ts — ÚNICO lugar que escolhe a implementação
import { SupabaseOrdemRepository } from './supabase/SupabaseOrdemRepository';
// import { ApiOrdemRepository } from './api/ApiOrdemRepository'; // futuro (Node)

export const ordemRepository: OrdemRepository = new SupabaseOrdemRepository();
```

```ts
// src/services/ordemService.ts
import { ordemRepository } from '@/data';
import { podeTransitar } from '@/domain/ordem/transicoes';

export async function concluirOrdem(id: string) {
  const ordem = await ordemRepository.buscarPorId(id);
  if (!ordem) throw new Error('OS não encontrada');
  if (!podeTransitar(ordem.status, 'concluida')) {
    throw new Error(`Não é possível concluir uma OS com status ${ordem.status}`);
  }
  // A checagem aqui é para dar retorno rápido na tela; a garantia real
  // fica na Edge Function chamada por alterarStatus (ver seção 11).
  return ordemRepository.alterarStatus(id, 'concluida');
}
```

```tsx
// src/pages/ordens/ListaOrdens.tsx — a tela não sabe que o Supabase existe
import { useQuery } from '@tanstack/react-query';
import { listarOrdens } from '@/services/ordemService';

export function ListaOrdens() {
  const { data } = useQuery({ queryKey: ['ordens'], queryFn: () => listarOrdens({}) });
  // ...
}
```

### Garantia automática da regra 1

Configurar o ESLint para bloquear importações do Supabase fora da pasta permitida:

```js
// eslint.config.js (trecho)
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/data/supabase/**'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{ name: '@supabase/supabase-js', message: 'Use os services. Supabase só em src/data/supabase/.' }],
      patterns: [{ group: ['**/data/supabase/*'], message: 'Importe de @/data, não da implementação.' }],
    }],
  },
}
```

> Exceção: `src/data/index.ts` pode importar de `./supabase/` (é o ponto de composição).

---

## 8. Stack de tecnologias

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | Um só código para escritório e celular |
| App do técnico | PWA (`vite-plugin-pwa`) | Instala no celular sem loja de apps |
| Rotas | React Router | |
| Dados no front | TanStack Query | Cache, recarregamento, estados de carregando/erro |
| Formulários e validação | React Hook Form + Zod | Zod também valida a saída da IA |
| Banco | PostgreSQL via Supabase | Migrations versionadas com Supabase CLI |
| Login | Supabase Auth | Sempre via `authService` |
| Fotos e anexos | Supabase Storage | Sempre via `storageService`; buckets privados |
| Lógica de servidor | Supabase Edge Functions | IA e PDF; nenhuma chave secreta no navegador |
| IA | Claude API (modelo Haiku) | Mensagem → rascunho de OS |
| PDF | `@react-pdf/renderer` | Relatório montado com componentes React |
| Assinatura | `react-signature-canvas` | Captura na tela do celular |
| Fila de fotos | IndexedDB (lib `idb`) | Guarda e reenvia quando o sinal voltar |
| Testes | Vitest + Testing Library + PGlite | Unitários e telas (projeto `app`); migrations e RLS num Postgres em memória (projeto `banco`, em `supabase/tests/`) |
| Qualidade | ESLint + Prettier + Husky/lint-staged | Verificação automática antes de cada commit |
| Clima (rodapé do menu) | Open-Meteo (clima atual) + BigDataCloud (nome da cidade) | Gratuitos, sem chave; chamados do navegador via `data/clima/` (interface `ClimaProvider`) |
| Hospedagem | Vercel ou Netlify + Supabase (região São Paulo) + GitHub | Dados no Brasil ajudam na LGPD |

**Para depois do MVP:** cobrança recorrente (Asaas ou Mercado Pago), WhatsApp (API oficial da Meta ou provedor como Z-API), app nativo (React Native + Expo).

**Backend futuro:** Node.js com Fastify ou NestJS + Prisma (ou Drizzle) + o mesmo PostgreSQL.

---

## 9. Estrutura de pastas

Itens marcados com ✅ já existem; os demais chegam nas próximas etapas.

```
src/
  domain/                    ← TS puro: tipos, schemas Zod e regras de negócio
    erros.ts                 ✅ ErroDados (falhas de leitura e gravação)
    comum/campos.ts          ✅ validações reaproveitadas (texto, telefone, CEP, data)
    comum/saudacao.ts        ✅ "Bom dia", "Boa tarde" ou "Boa noite" conforme a hora
    clima/                   ✅ códigos de tempo, local padrão (Passos/MG), arredondar coordenadas
    auth/                    ✅ credenciais, nova senha, ErroAutenticacao
    organizacao/             ✅ papéis e regra "pode editar cadastros"
    cliente/                 ✅ cliente, local de atendimento, CPF/CNPJ
    equipamento/
      tipos.ts               ✅ tipos de equipamento, periodicidades
      preventiva.ts          ← cálculo da próxima manutenção (etapa 8)
    ordem/
      tipos.ts               ✅ OS, status, prioridade, tipo de serviço, formulário
      transicoes.ts          ✅ fluxo de status da seção 4
      filtros.ts             ✅ filtros da lista (situação, prioridade, técnico, período)
      preenchimento.ts       ✅ OS aberta a partir do cliente ou do equipamento
      planejamento.ts        ✅ agendar, cancelar, atrasada, de hoje, conflito de horário
      execucao.ts            ✅ quem executa, tempo trabalhado, pausa, checklist, anotações, fotos
    ia/
      promptRascunhoOS.ts
  services/                  ← o que as telas usam
    authService.ts           ✅
    organizacaoService.ts    ✅
    clienteService.ts        ✅ clientes e locais
    equipamentoService.ts    ✅
    ordemService.ts          ✅ inclui iniciar, pausar e retomar
    execucaoService.ts       ✅ checklist, diagnóstico, materiais e atividades
    storageService.ts        ✅ fotos: fila no aparelho, envio, endereços temporários
    iaService.ts
  data/
    index.ts                 ✅ ÚNICO ponto que escolhe a implementação
    repositories/            ✅ interfaces (AuthProvider, Organizacao, Cliente, Local, Equipamento, Ordem,
                                Execucao, StorageProvider, FilaFotos, Clima)
    clima/                   ✅ clima atual e nome da cidade (Open-Meteo e BigDataCloud)
    fila/                    ✅ fila de fotos no IndexedDB (lib idb)
    supabase/                ✅ implementação atual (único lugar com Supabase)
      client.ts              ✅ cliente criado no primeiro uso
      tipos-banco.ts         ✅ gerado com `npm run db:tipos` (não editar à mão)
      mapeadores.ts          ✅ banco (snake_case) ↔ domínio (camelCase)
      erros.ts               ✅ erros do Postgres → ErroDados com mensagem em português
    api/                     ← implementação futura (API Node)
  pages/                     ✅ auth/, clientes/, equipamentos/, ordens/, agenda/, campo/ (técnico)
  components/
    ui/                      ✅ shadcn (só visual)
    layout/                  ✅ escritório (menu lateral, busca geral) e técnico (menu inferior)
    ordem/                   ✅ etiquetas de status e prioridade
    execucao/                ✅ checklist, anotações, atividades, fotos e resumo (editável ou só leitura)
    formulario/              ✅ campos ligados ao React Hook Form
    pagina/                  ✅ cabeçalho, busca, estados de carregando/erro
    tabela/                  ✅ tabela com busca, ordenação e paginação
  hooks/                     ✅ useSessao, useOrganizacao, usePessoaLogada, useAgora (relógio),
                                useLocalizacao, useFotosPendentes, useEnvioDeFotos
  lib/                       ✅ utilitários genéricos (texto, datas, chaves do cache, redução de fotos)
  test/                      ✅ preparação e dados de exemplo dos testes de tela
supabase/
  migrations/                ✅ SQL versionado
  tests/                     ✅ testes de RLS e regras do banco (PGlite)
  seed.sql                   ✅ dados de exemplo fictícios
  functions/                 ✅ Edge Functions (finas, chamam domain/)
    alterar-status-ordem/    ✅ agendar, reagendar, cancelar, iniciar, pausar e retomar
                                (index.ts = Deno; regras.ts = TS puro)
docs/
  pdf/                       ← mockups, roteiro de entrevista e materiais de referência
  imagens/                   ← identidade visual (logos)
```

### Onde fica o quê

Todo o TypeScript do app fica em `src/`. A única exceção são os testes do banco, em `supabase/tests/`.

| Pasta | O que guarda | Exemplo |
|---|---|---|
| `src/pages/` | As telas, uma subpasta por módulo | `clientes/ListaClientes.tsx` |
| `src/components/` | Peças de tela reaproveitadas; em `ui/` ficam os componentes do shadcn | `formulario/CampoTexto.tsx` |
| `src/services/` | O que as telas chamam (regras do app) | `clienteService.ts` |
| `src/domain/` | Tipos e validações em TS puro, sem banco nem tela | `cliente/documento.ts` (CPF/CNPJ) |
| `src/data/repositories/` | Interfaces: **o que** dá para fazer com os dados | `ClienteRepository.ts` |
| `src/data/supabase/` | Implementação: **como** fazer no Supabase | `SupabaseClienteRepository.ts` |
| `src/hooks/` | Hooks do React | `useSessao.ts` |
| `src/lib/` | Utilitários gerais | `texto.ts` |
| `src/test/` | Ajudantes dos testes de tela | `setup.ts` |
| `supabase/tests/` | Testes do banco (RLS e regras), com `npm run test:banco` | `cadastros.test.ts` |

**Extensões dos arquivos**

- **`.tsx`**: TypeScript com tela (JSX, o HTML escrito dentro do código). Usado em telas e componentes.
- **`.ts`**: TypeScript só com lógica, sem tela. Usado em `domain`, `services`, `data` e `lib`.
- **`.test.ts` / `.test.tsx`**: testes, guardados ao lado do arquivo que testam.

### Como rodar e ver o app

| Para quê | Comando | Onde abrir |
|---|---|---|
| Desenvolver (a tela se atualiza ao salvar) | `npm run dev` | `http://localhost:5173` |
| Ver a versão final e instalar como app (PWA) | `npm run build` e depois `npm run preview` | `http://localhost:4173` no Chrome ou Edge → ícone de instalar na barra de endereço |
| Testar no celular de qualquer rede (túnel HTTPS temporário da Cloudflare) | `npm run dev` num terminal e `npm run tunel` em outro | Endereço `https://….trycloudflare.com` que aparece no terminal (muda a cada vez; para quando fecha o comando) |
| Rodar os testes | `npm test` (tudo) ou `npm run test:banco` (só banco) | Terminal |
| Publicar uma Edge Function na nuvem | `npx supabase functions deploy <nome> --use-api` (sem Docker) | Terminal |

**Ver dentro do VS Code**

- **Simple Browser** (já vem no VS Code): `Ctrl + Shift + P` → "Simple Browser: Show" → `http://localhost:5173`. Não simula celular.
- **Microsoft Edge Tools for VS Code** (extensão): abre o app numa aba com as ferramentas de desenvolvedor e simula celular e tablet (botão de simular aparelho na barra da aba). Bom para testar a tela do técnico.
- Fora do VS Code: no Chrome ou Edge, `F12` e depois `Ctrl + Shift + M` mostram a página no tamanho de um celular.

Para parar o app no terminal: `Ctrl + C`.

### Trabalhar em dois computadores

O projeto é desenvolvido em dois computadores (casa e trabalho), sincronizados pelo GitHub. O banco é um só, na nuvem do Supabase.

**Versão do Node travada:** `engines` no `package.json` (Node 24), `.npmrc` com `engine-strict=true` (o `npm install` recusa outra versão) e `.nvmrc` (`nvm use` troca para a versão certa).

**Uma vez em cada computador** (fica fora do Git):

1. Instalar o Node 24 e clonar o repositório (ou `git pull` numa pasta já existente).
2. `npm install`
3. Criar o `.env.local` a partir do `.env.example`, com a URL e a chave `anon` (painel do Supabase → Project Settings → API).
4. Só para comandos de nuvem (`db push`, `functions deploy`, `npm run db:tipos`): `npx supabase login` e `npx supabase link --project-ref <ref>`.

**Rotina**

- **Ao começar:** `git pull`. Se o `package-lock.json` mudou, o hook `post-merge` do Husky roda o `npm install` sozinho.
- **Ao terminar:** commit e `git push`, para o outro computador receber o trabalho.

---

## 10. Modelo de dados

Toda tabela de negócio tem `organizacao_id` (direta ou indiretamente), com **RLS** e testes de acesso cruzado.

| Tabela | Finalidade |
|---|---|
| `organizacoes` | Cada prestadora; raiz do isolamento |
| `usuarios` | Perfil ligado ao login (`auth.users`) |
| `organizacao_usuarios` | Vínculo usuário–empresa e papel (`admin`, `gestor`, `tecnico`) |
| `clientes` | Quem a prestadora atende |
| `locais_atendimento` | Endereços, unidades e setores do cliente |
| `equipamentos` | Identificação, marca/modelo, capacidade, série, `periodicidade_dias`, `proxima_manutencao` |
| `ordens_servico` | Cliente, local, problema, prioridade, status, técnico, horário agendado, `duracao_minutos`, `motivo_cancelamento`, `os_origem_id` (retorno) |
| `ordem_servico_equipamentos` | Equipamentos atendidos na OS (uma preventiva pode cobrir vários) |
| `ordem_servico_eventos` | Histórico de status, atribuições e alterações relevantes |
| `ordem_servico_execucao` | Diagnóstico e materiais (texto livre) de cada OS |
| `ordem_servico_itens` | Atividades executadas (o tempo vem dos eventos de status, não é digitado) |
| `checklist_modelos` | Modelo por tipo de serviço em cada empresa (preventiva, corretiva, instalação) |
| `checklist_respostas` | Itens **copiados** do modelo para cada OS e a resposta (OK, não conforme, não se aplica) |
| `anexos` | **Caminho** das fotos no Storage (nunca a URL completa) |
| `assinaturas` | Assinatura do cliente com nome, data e caminho da imagem |

**Relacionamentos principais**

- Uma organização tem vários usuários, clientes, equipamentos e OS.
- Um cliente tem vários locais; um local tem vários equipamentos.
- Uma OS pertence a um cliente e a um local, tem um técnico e um ou mais equipamentos.
- Itens, eventos, respostas de checklist, anexos e assinatura pertencem a uma OS.
- Constraints impedem ligar registros de organizações diferentes.

**Ficam para a fase SaaS:** `contratos`, `planos_manutencao` (PMOC), `tecnicos`, `orcamentos`, `assinaturas_plataforma`, `faturas`.

**Convenções**

- Nomes de tabelas e colunas em português, `snake_case`, plural nas tabelas.
- Chaves primárias `uuid`.
- Colunas `criado_em`, `atualizado_em` e `organizacao_id` em toda tabela de negócio.
- Datas com horário em `timestamptz`; datas sem horário (instalação, próxima manutenção) em `date`.
- **Cadastros não são apagados pelo app:** a coluna `ativo` arquiva (some das listas, mas o histórico de atendimentos continua ligado a eles).
- **Mesma empresa garantida pelo banco:** tabelas filhas usam chave estrangeira composta `(id, organizacao_id)` (ex.: um local só pode apontar para um cliente da mesma organização). A OS vai além: aponta para `(local, cliente, organização)` de uma vez, então o local precisa ser do cliente escolhido, e o técnico precisa ser membro da empresa.
- **Número da OS** (`numero`) sequencial dentro de cada empresa ("OS 42"), dado pelo banco num contador por empresa (`privado.contadores_ordem`); duas OS abertas ao mesmo tempo nunca repetem o número.
- **Abrir e editar OS numa só transação:** as funções `abrir_ordem_servico` e `editar_ordem_servico` gravam a OS e os equipamentos juntos (ou tudo, ou nada). Rodam com as permissões de quem chama (passam pelo RLS) e não têm regra de negócio, só agrupam as gravações. Na API Node, viram uma transação comum.
- **Histórico pelo banco:** abertura e edição de OS geram a linha em `ordem_servico_eventos` por gatilho, com quem fez e o que mudou. O app não grava no histórico diretamente.
- **Mudança de status:** gravada só pela função `registrar_mudanca_status` (OS e histórico na mesma transação), que só a chave de serviço da Edge Function executa. Ela recebe o status esperado: se outra pessoa mudou a OS no meio do caminho, nada é gravado.
- **Planejamento:** `duracao_minutos` (padrão 60) monta a agenda; OS `agendada` sempre tem técnico e horário, e OS `cancelada` sempre tem `motivo_cancelamento` (constraints).
- **Execução (etapa 4):** só o técnico atribuído grava, e só com a OS em execução (fotos também pausada). Toda empresa nasce com modelos de checklist padrão (gatilho em `organizacoes`); `preparar_checklist` copia os itens do modelo para a OS, então mudar o modelo depois não altera OS antigas. Quem respondeu e quando vêm do banco. O **tempo trabalhado** é a soma dos trechos entre "iniciar/retomar" e "pausar" no histórico (`src/domain/ordem/execucao.ts`). Fotos: caminho fixo `empresa/OS/id.jpg` (constraint), id gerado no celular para o reenvio não duplicar.
- CPF/CNPJ, telefone e CEP guardados **só com dígitos**; a pontuação é colocada na tela.

---

## 11. Segurança

> **Princípio:** o navegador não é confiável. Qualquer usuário logado pode chamar o Supabase diretamente, sem passar pelas telas. Toda regra que protege dados ou o fluxo da OS precisa valer **no servidor** (banco ou Edge Function), não só no frontend.

### Isolamento entre empresas

- Toda tabela de negócio vinculada a uma organização, com **Row Level Security** habilitado.
- **RLS é obrigatória enquanto o navegador falar direto com o Supabase:** sem ela, qualquer usuário logado (ou anônimo, com a chave `anon`) lê os dados de todas as empresas pela API.
- Tabelas criadas por migration **não** vêm com RLS ligada: toda migration que cria tabela inclui `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e suas políticas. Tabela com RLS ligada e sem política fica bloqueada para todos.
- Conferir o **Security Advisor** do painel do Supabase a cada entrega (aponta tabelas expostas sem RLS). Pelo terminal: `npx supabase db advisors --linked`.
- Políticas com `USING` (o que pode ler) **e** `WITH CHECK` (o que pode gravar): o `organizacao_id` enviado pelo cliente nunca é aceito sem conferir que o usuário pertence àquela organização.
- Validar relações: cliente, local, equipamento e OS devem pertencer à mesma organização (constraints).
- **Testes de acesso cruzado:** um usuário da empresa A nunca lê nem altera dados da empresa B.

### Permissões por papel

As permissões da seção 5 são garantidas **no RLS**, não só escondendo botões na tela:

| Papel | Ordens de serviço | Cadastros (clientes, locais, equipamentos) | Usuários e configurações |
|---|---|---|---|
| `admin` | Todas da organização | Ler e alterar | Ler e alterar |
| `gestor` | Todas da organização | Ler e alterar | Sem acesso |
| `tecnico` | Somente as atribuídas a ele | Somente leitura | Sem acesso |

- Testes automatizados também para papéis: um técnico não lê OS de outro técnico nem altera cadastros.
- Exceção consciente (aviso do Security Advisor): `preparar_checklist` é `SECURITY DEFINER` e pode ser chamada por usuários logados. É de propósito: ela confere primeiro se quem chama é o técnico da OS em execução e é o único caminho para criar os itens do checklist, sempre copiados do modelo (com `SECURITY INVOKER`, o app precisaria poder inserir itens à mão).
- Exceção consciente: o `gestor` **lê** a lista de vínculos da empresa (`organizacao_usuarios`), porque precisa escolher o técnico ao agendar uma OS. Ele não altera vínculos nem papéis.

### Operações sensíveis no servidor

- Mudança de status, conclusão, cancelamento e assinatura passam por uma **Edge Function** que reutiliza `src/domain/ordem/transicoes.ts`, confere organização e papel do usuário e grava o evento em `ordem_servico_eventos`.
  - **Feito na etapa 3:** `alterar-status-ordem` agenda, reagenda e cancela. **Etapa 4:** inicia, pausa (com motivo) e retoma, só pelo técnico atribuído à OS (admin e gestor recebem "sem permissão"; técnico de outra OS, "não encontrada"). O `transicoes.ts` não tem importações, por isso o Deno usa o mesmo arquivo do app (a publicação leva o arquivo de `src/` junto). A checagem automática de token do Supabase está desligada (`verify_jwt = false` no `config.toml`) porque a função confere o login com `auth.getUser`; quem não é da empresa recebe "não encontrada".
- O usuário comum **não pode alterar a coluna `status` diretamente** (permissão de coluna no banco); só a Edge Function altera.
- OS `concluida` ou `cancelada` não pode mais ser editada; a assinatura não pode ser trocada depois de registrada.
- Isso respeita a regra 12 da seção 7: o banco só bloqueia; a regra de negócio continua em TypeScript.

### Autenticação

- Confirmação de e-mail obrigatória e senha com no mínimo 8 caracteres.
- Limite de tentativas de login e de recuperação de senha (configuração do Supabase Auth).
- Autenticação em dois fatores (MFA) recomendada para `admin`; obrigatória a partir da fase SaaS.
- Usuário removido de uma organização perde o acesso imediatamente (vínculo em `organizacao_usuarios` desativado).

### Chaves e segredos

- Nenhuma chave secreta (IA ou `service_role`) no código do navegador nem no repositório.
- A chave `anon` do Supabase é pública por design; quem protege os dados é o RLS.
- Arquivos `.env` no `.gitignore`; segredos das Edge Functions configurados no painel/CLI do Supabase.
- Edge Functions que usam `service_role` (ignora o RLS) **sempre** conferem organização e papel do usuário antes de gravar.

### Arquivos (fotos, assinaturas e PDFs)

- Buckets do Storage privados, com políticas por organização. **Feito na etapa 4:** bucket `anexos` (só JPEG, até 10 MB); o técnico envia só para a pasta da OS que está executando; quem lê a OS vê as fotos dela.
- Acesso por **URLs assinadas com validade curta** (ex.: 1 hora); nunca URLs públicas.
- Aceitar apenas imagens e PDF, com limite de tamanho por arquivo.
- **Fila de fotos no celular (IndexedDB):** apagar as fotos da fila após o envio e ao sair da conta. **Feito na etapa 4:** as fotos são reduzidas no celular (lado maior 1600 px, JPEG) e saem da fila ao serem enviadas; "Sair" apaga a fila e avisa antes se houver fotos não enviadas.

### Backup e auditoria

- Backup diário do banco (plano do Supabase com backup automático ou `pg_dump` agendado) e **teste de restauração** antes de cadastrar o primeiro dado real (ver [checklist antes do piloto](#checklist-antes-do-piloto)).
- Trilha de alterações em `ordem_servico_eventos` (quem, quando, o quê).
- Funcionamento offline, se houver, desenhado e testado explicitamente.

### LGPD e privacidade

- Dados hospedados no Brasil (Supabase região São Paulo).
- **Ambiente hospitalar:** fotografar apenas equipamentos e instalações, nunca pacientes, prontuários, telas ou documentos. Dados do contratante são confidenciais.
- Termos de uso e política de privacidade antes do primeiro cliente pagante.
- Informar que mensagens coladas para a IA são enviadas a um serviço externo (Claude API); orientar a não colar dados pessoais desnecessários.
- **Clima do rodapé:** a localização só é usada com permissão do navegador, é arredondada para cerca de 1 km antes de sair do computador e vai apenas para os serviços de clima e de nome da cidade (Open-Meteo e BigDataCloud). Nada disso é gravado no banco.
- Exportar e excluir todos os dados de uma organização quando ela encerrar a conta.

### Repositório e dependências

- Repositório privado, com **Dependabot** ativo para alertas de vulnerabilidade.
- Atualizar dependências com regularidade e revisar alertas antes de cada entrega.

---

## 12. IA no MVP

**Funcionalidade:** o usuário cola uma mensagem (ex.: do WhatsApp) e a IA devolve um **rascunho de OS** com cliente, local, equipamento, problema e prioridade sugeridos.

- Executada numa **Edge Function** (chave da API nunca no navegador).
- Saída em JSON validada com **Zod** antes de chegar à tela.
- O usuário **sempre revisa e confirma**; a IA nunca cria nem fecha OS sozinha.
- A IA sugere e organiza; não inventa diagnósticos, serviços ou dados técnicos.
- O prompt fica em `src/domain/ia/` (TS puro), reaproveitável no Node.

---

## 13. Etapas de desenvolvimento

Cada etapa entrega algo testável. Ao fim da **etapa 5**, com o [checklist antes do piloto](#checklist-antes-do-piloto) completo, o MVP pode ir para o piloto.

| Etapa | Entrega | Situação |
|---|---|---|
| 0. Fundação | Projeto Vite, estrutura de pastas, ESLint com a regra de importação, Supabase CLI, migrations, login, organizações, usuários, RLS e permissões por papel testadas, base de segurança da seção 11 | ✅ Concluída |
| 1. Cadastros | Clientes, locais e equipamentos | ✅ Concluída |
| 2. Abertura de OS | Formulário de abertura e lista com filtros | ✅ Concluída |
| 3. Planejamento | Agendamento, atribuição e agenda por técnico | ✅ Concluída |
| 4. Execução | Tela do técnico: diagnóstico, checklist, tempo, fotos com fila | ✅ Concluída |
| 5. Conclusão | Assinatura, revisão, encerramento e PDF | ⏳ Próxima |
| 6. Histórico | Linha do tempo por equipamento e por cliente | |
| 7. IA | Mensagem → rascunho de OS | |
| 8. Preventiva simples | Periodicidade e lista de vencimentos | |

### Checklist da etapa 0

- [x] Criar projeto com Vite + React + TypeScript + Tailwind
- [x] Ativar `strict: true` no `tsconfig` (regra 13 da seção 7)
- [x] Configurar alias `@/` para `src/`
- [x] Criar a estrutura de pastas da seção 9
- [x] Configurar ESLint com `typescript-eslint` e `no-restricted-imports` (seção 7)
- [x] Configurar Prettier e verificação automática antes de cada commit (Husky + lint-staged)
- [x] Instalar shadcn/ui (Radix + estilo Vega) e as bibliotecas da seção 8
- [x] Configurar Vitest + Testing Library e PWA (`vite-plugin-pwa`)
- [x] Instalar e inicializar Supabase CLI (`supabase/config.toml`)
- [x] Criar o projeto no Supabase (região São Paulo), `supabase link` e preencher `.env.local` a partir do `.env.example`
- [x] Primeira migration com `organizacoes`, `usuarios`, `organizacao_usuarios` (aplicada na nuvem com `supabase db push`)
- [x] Criar `.gitignore` com `.env`
- [x] Ativar o Dependabot no GitHub
- [x] Ícones do PWA (192, 512 e maskable) exportados do logo
- [x] Políticas RLS com `USING` e `WITH CHECK`, permissões por papel (seção 11) e testes de acesso cruzado entre empresas e entre papéis (`supabase/tests/`, rodam com PGlite)
- [x] Configurar Supabase Auth: confirmação de e-mail, senha mínima e limite de tentativas (`supabase/config.toml`, aplicado com `supabase config push`; conferir a diferença antes, para não desligar o MFA da nuvem)
- [x] `AuthProvider` (interface) + implementação Supabase + `authService`
- [x] Telas de login e recuperação de senha usando só `authService`
- [x] Primeiro acesso: empresa e usuário admin criados pelo painel do Supabase, login funcionando na nuvem

> **Etapa 0 concluída.** O backup do banco saiu daqui e foi para o [checklist antes do piloto](#checklist-antes-do-piloto): enquanto só existem dados de teste, a estrutura do banco já está guardada no Git (migrations), e não há dado real a perder.

### Checklist da etapa 1

- [x] Migration com `clientes`, `locais_atendimento` e `equipamentos`; chaves compostas `(id, organizacao_id)` impedem ligar cadastros de empresas diferentes
- [x] RLS: todos os membros leem; admin e gestor cadastram e alteram; técnico só consulta; ninguém apaga (arquivar = `ativo = false`)
- [x] Testes de acesso cruzado e de regras de dados (`supabase/tests/cadastros.test.ts`)
- [x] Validação de CPF/CNPJ pelos dígitos verificadores, telefone, CEP e UF (`src/domain/`)
- [x] Repositórios, `clienteService` e `equipamentoService`; tipos do banco gerados com `npm run db:tipos`
- [x] Layout do escritório (menu lateral, que vira menu deslizante no celular) e cores da marca
- [x] Telas: lista, cadastro, edição e detalhe de clientes (com locais) e de equipamentos; busca sem acentos, ordenação e paginação (TanStack Table v9)
- [x] Dados de exemplo fictícios (`supabase/seed.sql`), aplicados na nuvem com `npx supabase db query --linked -f supabase/seed.sql`

> **Etapa 1 concluída.** A barra superior ainda não tem a busca global nem o botão "Nova OS" (seção 6): eles chegam na etapa 2, junto com as ordens de serviço. A linha do tempo de atendimentos do equipamento chega na etapa 6.

### Checklist da etapa 2

- [x] Migration com `ordens_servico`, `ordem_servico_equipamentos` e `ordem_servico_eventos`; número sequencial por empresa; local precisa ser do cliente e técnico precisa ser da empresa (chaves compostas)
- [x] RLS: admin e gestor abrem, leem e editam; técnico só lê as OS atribuídas a ele; OS concluída ou cancelada não se edita; ninguém apaga; o app não grava status, técnico, número nem histórico
- [x] Abertura e edição numa só transação (`abrir_ordem_servico` e `editar_ordem_servico`) e histórico de abertura e edição por gatilho
- [x] Testes de acesso cruzado, de papéis e de regras de dados (`supabase/tests/ordens.test.ts`)
- [x] Domínio em TS puro: tipos e formulário da OS, transições de status da seção 4 (`transicoes.ts`) e filtros da lista
- [x] `OrdemRepository`, `ordemService` e lista de pessoas da empresa (para o filtro de técnico)
- [x] Telas: lista com filtros (situação, prioridade, técnico e período de abertura, guardados no endereço), abertura, edição e detalhe com histórico
- [x] Barra superior com busca geral (OS, clientes e equipamentos; atalho Ctrl+K) e botão "Nova OS"; botão "Abrir OS" no cliente e no equipamento; cartões de OS no painel
- [x] OS de exemplo no `supabase/seed.sql` (só nos clientes de exemplo)

> **Etapa 2 concluída.** Campos obrigatórios da OS decididos: cliente, local, tipo de serviço, prioridade e problema relatado; equipamentos e solicitante são opcionais. Cancelar, agendar e atribuir técnico são mudanças de status e chegam na etapa 3, pela Edge Function da seção 11. O filtro por técnico já existe, mas só faz diferença depois que a etapa 3 permitir atribuir técnicos. O vínculo de retorno (`os_origem_id`) fica para quando houver OS concluídas (etapa 5).

> **Extra depois da etapa 2:** rodapé do menu lateral com saudação, primeiro nome, relógio e clima da cidade onde está o computador (seções 6 e 11).

### Checklist da etapa 3

- [x] Migration: `duracao_minutos`, `motivo_cancelamento`, evento `reagendamento`, regras "agendada tem técnico e horário" e "cancelada tem motivo", e a função `registrar_mudanca_status` (só para a chave de serviço)
- [x] Edge Function `alterar-status-ordem` (agendar, reagendar e cancelar): confere login, empresa, papel (admin e gestor), técnico ativo e transição pela `transicoes.ts`; regras em `regras.ts`, testadas com o Vitest
- [x] Testes do banco (`supabase/tests/planejamento.test.ts`) e das regras da função (`supabase/tests/regrasStatus.test.ts`); o banco de teste imita a chave de serviço
- [x] Domínio: formulário de agendamento e de cancelamento, OS atrasada, de hoje e aviso de conflito de horário do técnico (`planejamento.ts`)
- [x] Detalhe da OS: botões "Agendar"/"Reagendar" e "Cancelar OS" (com motivo), duração prevista e motivo do cancelamento
- [x] Agenda (FullCalendar v7): dia, semana e lista; filtro por técnico; arrastar ou esticar um bloco reagenda; lista "Aguardando agendamento"; carregada só quando a tela é aberta
- [x] Lista de OS com filtro "Atrasadas" e coluna "Agendada para"; painel com OS atrasadas, atendimentos de hoje e agenda do dia
- [x] Migration aplicada na nuvem (`supabase db push`) e Edge Function publicada (`npx supabase functions deploy alterar-status-ordem --use-api`); sem login, a função responde 401
- [x] **Teste no app de verdade** (com login): agendar a OS 1, reagendar arrastando na Agenda e cancelar uma OS

> **Etapa 3 concluída.** Atrasada = agendada cujo horário de início passou sem a execução começar. O aviso de conflito de horário não bloqueia (às vezes o técnico atende dois chamados no mesmo prédio). Pausar e iniciar a execução chegam na etapa 4, pela mesma Edge Function.

### Checklist da etapa 4

Decisões: **modelos de checklist prontos** por tipo de serviço; **tempo automático** (Iniciar, Pausar e Retomar); **só o técnico da OS registra a execução** (admin e gestor acompanham).

- [x] Migration: `checklist_modelos` (com os modelos padrão para as empresas atuais e futuras), `checklist_respostas`, `ordem_servico_execucao`, `ordem_servico_itens`, `anexos`, bucket `anexos` e políticas do Storage
- [x] RLS: só o técnico atribuído grava, com a OS em execução (fotos também pausada); quem lê a OS lê a execução; ninguém cria itens de checklist à mão
- [x] Testes do banco (`supabase/tests/execucao.test.ts`), inclusive o Storage, imitado no PGlite
- [x] Edge Function: ações `iniciar` (também retoma) e `pausar` (com motivo), testadas em `regrasStatus.test.ts`
- [x] Domínio: tempo trabalhado a partir dos eventos, motivo da pausa, permissões da execução (`execucao.ts`)
- [x] Fotos: redução no celular, fila no IndexedDB, envio automático (ao abrir, quando o sinal volta e a cada 30 s), reenvio sem duplicar, recusa com "Descartar"
- [x] Telas do técnico (`/campo`): Hoje, Minhas OS, Execução (iniciar/pausar/retomar, checklist com um toque, diagnóstico e materiais salvos ao sair do campo, atividades, fotos) e Perfil
- [x] Entrada: quem é só técnico abre no modo técnico; modo autônomo abre nele no celular e no escritório no computador; item "Modo técnico" no menu
- [x] Escritório: detalhe da OS mostra a execução (tempo, checklist, anotações, atividades, fotos) só para leitura e o atalho "Executar" para o técnico da OS
- [x] **Aplicado na nuvem:** `npx supabase db push`, `npx supabase functions deploy alterar-status-ordem --use-api` e `npm run db:tipos`; sem login, a função responde 401
- [x] **Revisão após o primeiro teste no celular (iPhone/Safari, pelo túnel):** diagnóstico e materiais não salvavam (o upsert exigia permissão nas colunas de chave) — corrigido com a função `salvar_anotacoes_execucao` (migration `20261022130000`) e aviso em destaque quando um salvamento falha; observação do checklist apagada ao trocar de "não conforme" para outra resposta; id das fotos gerado também fora de HTTPS; leitura da foto em Safari antigo; mensagem clara quando o aparelho não consegue guardar a foto; chamadas à Edge Function com limite de 20 s (sem sinal, "Sem conexão" em vez de "Aguarde…" para sempre)
- [x] **Teste no app de verdade, no celular** (iPhone/Safari, pelo túnel): iniciar, checklist (9 itens), diagnóstico, atividade, foto, pausar e retomar — tudo conferido no banco. Falta só a foto em modo avião no aparelho (a fila está coberta pelos testes automáticos)

> **Etapa 4 concluída e testada no celular.** A edição dos modelos de checklist pela empresa fica para a tela de Configurações. Concluir a OS (assinatura, revisão e PDF) é a etapa 5.

### Checklist antes do piloto

Itens que não travam o desenvolvimento, mas precisam estar prontos **antes de cadastrar o primeiro dado real** (o que vier primeiro: início do piloto ou uso de verdade com dados de clientes).

- [ ] **Backup diário do banco** com `supabase db dump` agendado no GitHub Actions (grátis; cópias guardadas por 30 dias) ou plano Pro do Supabase (backup automático)
- [ ] **Teste de restauração:** restaurar um backup num Supabase local (Docker) e conferir os dados
- [ ] **E-mail próprio (SMTP)** no Supabase Auth: o servidor grátis do Supabase envia poucos e-mails por hora, o que não basta para confirmação de cadastro e recuperação de senha de vários usuários
- [ ] **Publicar o app** (Vercel ou Netlify) e trocar no Supabase o `site_url` e os endereços de retorno de `localhost` para o endereço real
- [ ] **Security Advisor** do painel do Supabase sem alertas (hoje há dois: proteção contra senhas vazadas, recurso do plano Pro, e `preparar_checklist`, exceção consciente da seção 11; rodar `npx supabase db advisors --linked`)
- [ ] **Projeto ativo:** no plano grátis, o Supabase pausa o projeto após 7 dias sem uso; confirmar que isso não acontece durante o piloto (uso diário ou plano Pro)

---

## 14. Piloto

**Piloto principal:** um prestador que atende a **Santa Casa de Passos**. O usuário é o prestador; o hospital é cliente dele e, no MVP, apenas recebe os relatórios.

| Etapa | O que fazer |
|---|---|
| Conversa inicial | Como registra hoje os atendimentos, o que o hospital exige, o que mais dá trabalho |
| Cadastro | Hospital como cliente, setores como locais, uma amostra de equipamentos |
| Uso acompanhado | 2 a 4 semanas registrando OS reais, com conversas semanais |
| Avaliação | Comparar tempo, qualidade do relatório e aceitação pelo hospital |

**Critério de sucesso:** o prestador continua usando por vontade própria e o relatório é aceito pelo contratante.

**Indicadores**

- Tempo para registrar e fechar uma OS
- Percentual de atendimentos com relatório completo e assinatura
- Preventivas esquecidas antes e depois
- Frequência de uso pelo técnico e pelo gestor
- Disposição a continuar usando e a pagar

---

## 15. Evolução para SaaS

### Fase 2 — SaaS regional

- Cadastro e cobrança self-service
- **Módulo PMOC** (plano, cronograma e relatórios no formato exigido)
- Portal do cliente (ex.: hospital consulta equipamentos e relatórios)
- IA por voz e redação de relatórios
- Orçamentos e contratos com visitas recorrentes automáticas
- Integração com WhatsApp

### Fase 3 — SaaS em escala

- Estoque, financeiro e rentabilidade por contrato
- App nativo e offline completo
- Painel de administração da plataforma, auditoria e suporte
- Expansão para outras regiões e segmentos

### Preços (hipóteses a validar)

| Plano | Preço/mês | Para quem |
|---|---|---|
| Autônomo | R$ 59 | Um usuário, modo simplificado |
| Equipe | R$ 149 | Até 5 usuários, agenda por técnico, checklists personalizados |
| Profissional | R$ 299 | Mais usuários, módulo PMOC e portal do cliente |

---

## 16. Plano de migração para Node

A migração **não precisa ser de uma vez**. Caminho sugerido:

1. Criar uma API Node (Fastify ou NestJS) conectada **ao mesmo PostgreSQL**.
2. Criar implementações em `src/data/api/` (ex.: `ApiOrdemRepository`) que chamam a API via HTTP.
3. Trocar em `src/data/index.ts`, **um módulo por vez** (ex.: ordens primeiro, clientes depois).
4. Mover as Edge Functions para rotas Node, reaproveitando o código de `src/domain/`.
5. Opcional: manter Supabase Auth e Storage por mais tempo, ou migrar para outra solução (ex.: S3 + autenticação própria).
6. Por último, decidir se o banco continua no Supabase ou vai para outro Postgres (`pg_dump` / restore).

### Dificuldade por parte

| Parte | Dificuldade | Observação |
|---|---|---|
| Banco de dados | Baixa | Postgres puro; `pg_dump` e restore |
| Edge Functions | Baixa | Já em TypeScript e finas |
| Fotos (Storage) | Baixa a média | Copiar arquivos e trocar o prefixo dos caminhos |
| Regras de acesso (RLS) | Média | Podem continuar no Postgres ou ir para a API; com a API Node filtrando por organização e papel, a RLS deixa de ser obrigatória, mas é recomendado mantê-la como segunda camada |
| Autenticação | Média | Usuários exportáveis; fluxo de login muda |
| Front | **Baixa, se as regras da seção 7 forem seguidas** | Só `src/data/` muda |

---

## 17. Decisões em aberto

- [x] Campos obrigatórios de uma OS (decidido na etapa 2: cliente, local, tipo de serviço, prioridade e problema)
- [x] Modelos de checklist iniciais (decidido na etapa 4: preventiva split, corretiva e instalação; validar os itens com o piloto)
- [ ] Conteúdo mínimo do relatório em PDF para ser aceito pelos contratantes (validar com o piloto)
- [ ] Regras exatas do modo autônomo
- [ ] Critérios formais de sucesso do piloto
- [ ] Requisitos de documentação em ambiente hospitalar (levantar com o prestador e o contratante)
