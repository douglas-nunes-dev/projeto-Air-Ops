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
| Componentes | **shadcn/ui** (sobre Radix UI) | Código dos componentes fica no projeto (`src/components/ui/`); só visual, sem Supabase |
| Ícones | lucide-react | |
| Tabelas e listas | TanStack Table | Filtros, ordenação e paginação |
| Datas | date-fns (pt-BR) + calendário do shadcn | |
| Agenda | FullCalendar (versão gratuita) ou Schedule-X | Visões diária e semanal, arrastar para reagendar |
| Avisos | sonner | |
| Gráficos (fase 2) | Recharts via shadcn charts | |
| Fonte | Inter ou Geist | |

**Escritório (desktop) — admin e gestor**
- Menu lateral: Painel, Ordens, Agenda, Clientes, Equipamentos, Configurações
- Barra superior: busca, botão "Nova OS" e menu do usuário

**Técnico (celular)**
- Menu inferior: Hoje, Minhas OS, Perfil
- Botões grandes, poucos campos por tela, câmera a um toque
- Tela inicial: "Minhas OS de hoje", em ordem de horário

**Modo autônomo:** layout do escritório no computador e do técnico no celular.

### Painel operacional (MVP)

- **Cartões de resumo:** OS abertas, OS atrasadas (vermelho), atendimentos de hoje, preventivas vencendo em 30 dias. Clicar abre a lista já filtrada.
- **Agenda do dia** por técnico.
- **OS atrasadas.**
- **Preventivas vencendo**, com botão "Gerar OS".

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
12. **Evitar lógica de negócio complexa em funções SQL.** RLS e constraints sim; regras de negócio ficam em TypeScript.
13. **TypeScript limpo e fácil de entender.** O código deve ser lido por qualquer pessoa do projeto sem esforço:
   - `strict: true` no `tsconfig`; proibido `any` (usar `unknown` + validação com Zod quando o tipo for incerto).
   - Nomes claros e em português para o domínio (`concluirOrdem`, `proximaManutencao`), sem abreviações obscuras.
   - Funções pequenas, com uma única responsabilidade e retorno antecipado (`if (!ordem) throw ...`) em vez de `if` aninhados.
   - Preferir código simples e explícito a soluções "espertas"; evitar tipos genéricos complexos quando um tipo direto resolve.
   - Comentários só para explicar o **porquê** de uma decisão, não o que o código já mostra.
   - Formatação automática com **Prettier** e regras do **ESLint** (`typescript-eslint`) verificadas antes de cada commit.

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
| Hospedagem | Vercel ou Netlify + Supabase (região São Paulo) + GitHub | Dados no Brasil ajudam na LGPD |

**Para depois do MVP:** cobrança recorrente (Asaas ou Mercado Pago), WhatsApp (API oficial da Meta ou provedor como Z-API), app nativo (React Native + Expo).

**Backend futuro:** Node.js com Fastify ou NestJS + Prisma (ou Drizzle) + o mesmo PostgreSQL.

---

## 9. Estrutura de pastas

```
src/
  domain/                    ← TS puro: tipos, schemas Zod e regras de negócio
    ordem/
      tipos.ts
      transicoes.ts
    equipamento/
      tipos.ts
      preventiva.ts          ← cálculo da próxima manutenção
    cliente/
    ia/
      promptRascunhoOS.ts
  services/                  ← o que as telas usam
    ordemService.ts
    clienteService.ts
    equipamentoService.ts
    authService.ts
    storageService.ts
    iaService.ts
  data/
    index.ts                 ← ÚNICO ponto que escolhe a implementação
    repositories/            ← interfaces
      OrdemRepository.ts
      ClienteRepository.ts
      EquipamentoRepository.ts
      AuthProvider.ts
      StorageProvider.ts
    supabase/                ← implementação atual (único lugar com Supabase)
      client.ts
      mapeadores.ts
      SupabaseOrdemRepository.ts
      ...
    api/                     ← implementação futura (API Node)
  pages/
  components/
  hooks/
  lib/                       ← utilitários genéricos (datas, formatação)
supabase/
  migrations/                ← SQL versionado
  functions/                 ← Edge Functions (finas, chamam domain/)
```

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
| `ordens_servico` | Cliente, local, problema, prioridade, status, datas, técnico, `os_origem_id` (retorno) |
| `ordem_servico_equipamentos` | Equipamentos atendidos na OS (uma preventiva pode cobrir vários) |
| `ordem_servico_eventos` | Histórico de status, atribuições e alterações relevantes |
| `ordem_servico_itens` | Atividades e horas executadas |
| `checklist_modelos` | Modelo por tipo de serviço (ex.: "Preventiva split") |
| `checklist_respostas` | O que foi preenchido em cada OS |
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
- Datas em `timestamptz`.

---

## 11. Segurança

- Toda tabela de negócio vinculada a uma organização, com **Row Level Security** habilitado.
- **Testes de acesso cruzado:** um usuário da empresa A nunca lê nem altera dados da empresa B.
- Validar relações: cliente, local, equipamento e OS devem pertencer à mesma organização.
- Nenhuma chave secreta (IA ou `service_role`) no código do navegador.
- Buckets do Storage privados, com políticas por organização.
- Backup e trilha de alterações (`ordem_servico_eventos`).
- Funcionamento offline, se houver, desenhado e testado explicitamente.
- **Ambiente hospitalar:** fotografar apenas equipamentos e instalações, nunca pacientes, prontuários, telas ou documentos. Dados do contratante são confidenciais (LGPD).

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

Cada etapa entrega algo testável. Ao fim da **etapa 5**, o MVP pode ir para o piloto.

| Etapa | Entrega |
|---|---|
| 0. Fundação | Projeto Vite, estrutura de pastas, ESLint com a regra de importação, Supabase CLI, migrations, login, organizações, usuários, RLS testado |
| 1. Cadastros | Clientes, locais e equipamentos |
| 2. Abertura de OS | Formulário de abertura e lista com filtros |
| 3. Planejamento | Agendamento, atribuição e agenda por técnico |
| 4. Execução | Tela do técnico: diagnóstico, checklist, tempo, fotos com fila |
| 5. Conclusão | Assinatura, revisão, encerramento e PDF |
| 6. Histórico | Linha do tempo por equipamento e por cliente |
| 7. IA | Mensagem → rascunho de OS |
| 8. Preventiva simples | Periodicidade e lista de vencimentos |

### Checklist da etapa 0

- [ ] Criar projeto com Vite + React + TypeScript + Tailwind
- [ ] Ativar `strict: true` no `tsconfig` (regra 13 da seção 7)
- [ ] Configurar alias `@/` para `src/`
- [ ] Criar a estrutura de pastas da seção 9
- [ ] Configurar ESLint com `typescript-eslint` e `no-restricted-imports` (seção 7)
- [ ] Configurar Prettier e verificação automática antes de cada commit (ex.: Husky + lint-staged)
- [ ] Instalar e inicializar Supabase CLI; primeira migration com `organizacoes`, `usuarios`, `organizacao_usuarios`
- [ ] Políticas RLS e testes de acesso cruzado
- [ ] `AuthProvider` (interface) + implementação Supabase + `authService`
- [ ] Telas de login e recuperação de senha usando só `authService`

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
| Regras de acesso (RLS) | Média | Podem continuar no Postgres ou ir para a API |
| Autenticação | Média | Usuários exportáveis; fluxo de login muda |
| Front | **Baixa, se as regras da seção 7 forem seguidas** | Só `src/data/` muda |

---

## 17. Decisões em aberto

- [ ] Campos obrigatórios de uma OS
- [ ] Modelos de checklist iniciais (ex.: preventiva split, corretiva, instalação)
- [ ] Conteúdo mínimo do relatório em PDF para ser aceito pelos contratantes (validar com o piloto)
- [ ] Regras exatas do modo autônomo
- [ ] Critérios formais de sucesso do piloto
- [ ] Requisitos de documentação em ambiente hospitalar (levantar com o prestador e o contratante)
