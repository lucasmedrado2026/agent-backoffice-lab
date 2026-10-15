# agent-backoffice-lab

Projeto de **treino** de um product designer construindo um back-office de agentes de IA. Dados fictícios, nenhum hospital real, nenhum dado de paciente. Não é produto comercial.

## O que é

Um Next.js (App Router + TypeScript + Tailwind) com três camadas de experiência:

- **`/chat`** — chamada direta a um LLM (Claude Haiku 5.5 via `@ai-sdk/anthropic`), protegida por passcode. [Dia 2]
- **`/agent`** — agente com 2 ferramentas (`cadastrarCliente`, `listarClientes`) gravando num Supabase, com rastro visível de cada passo. [Dia 3]
- **`/agentes/testar`** — interface do time de CS para testar o agente, construída contra um **contrato tipado** com back-end simulado. [Dia 4]
- **`/agentes/painel`** — painel de acompanhamento de clientes, agentes e execuções, com métricas e rastro. [Dia 5]
- **`/agentes/novo`** — formulário guiado para o CS criar um agente (sem back-end). [pendente]

Está em produção em: https://agent-backoffice-lab.vercel.app

## Como rodar local

Requisitos: Node ≥ 20, npm. Testado em macOS (darwin 25.6.0).

```bash
git clone git@github.com:lucasmedrado2026/agent-backoffice-lab.git
cd agent-backoffice-lab
npm install
cp .env.example .env.local   # preencher ANTHROPIC_API_KEY, APP_PASSCODE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Abra http://localhost:3000.

## Estrutura

```
app/
  page.tsx                       # home padrão do Next
  chat/page.tsx                  # Dia 2 — chamada LLM
  agent/page.tsx                 # Dia 3 — agente com tools
  agentes/
    layout.tsx                   # shell com nav + faixa "Dados simulados"
    testar/page.tsx              # Dia 4 — UI do CS contra contrato tipado
    painel/
      page.tsx                   # Dia 5 — painel + blocos
      _components/
        formatters.ts            # formatação pt-BR
        estados.tsx              # loading / vazio / erro reutilizáveis
  api/
    chat/route.ts                # Dia 2 — POST /api/chat (servidor)
    agent/route.ts               # Dia 3 — POST /api/agent (servidor)

lib/
  contract.ts                    # tipos — fonte de verdade do contrato front/back
  api.ts                         # Dia 5 — camada única que a UI consome
  mock-api.ts                    # Dia 4 — mock de execução de agente
  mock-data.ts                   # Dia 5 — fábrica determinística de clientes/agentes/execs
  metrics.ts                     # Dia 5 — M1..M6 (funções puras)
  pricing.ts                     # Dia 5 — preços de EXEMPLO para custo estimado
  trace-humanizer.ts             # Dia 4 — passo técnico → frase pt-BR
  supabase.ts                    # Dia 3 — cliente server-only
  agent-tools.ts                 # Dia 3 — 2 tools (cadastrar/listar)

docs/
  dia4-progresso.md              # retomada do Dia 4
  dia5-progresso.md              # retomada do Dia 5
  contrato-front-back.md         # Dia 5 — proposta de contrato para o dev back-end
  evals.md                       # Dia 5 — o que é eval + como rodar manualmente
  notas-mcp.md                   # Dia 5 — notas de MCP para designer

evals/
  cases.json                     # Dia 5 — 8 casos de teste manual do agente

.claude/
  skills/
    ux-designer/                 # instalada no Dia 4
    ui-designer/                 # instalada no Dia 4
    LICENSE-claude-design-skills

DESIGN.md                        # fonte de verdade de design (seções 1–6)
```

## Decisões de design e técnicas (por quê)

- **Contrato tipado antes de UI**: `lib/contract.ts` é só tipos. Qualquer back-end que respeite o envelope `RunResult` consegue trocar o mock por API real sem mexer na UI. Garante independência front/back durante o aprendizado.
- **Chave sempre no servidor**: nenhuma variável tem prefixo `NEXT_PUBLIC_`. Route handlers (`/api/chat`, `/api/agent`) são os únicos pontos de acesso à Anthropic e ao Supabase.
- **`status` dirige a UI, nunca `finalText`**: o front não lê o texto do modelo para inferir sucesso/erro. Status é enum fechado; copy do modelo pode mudar.
- **Guardrail no banco > guardrail no prompt**: `unique(cnpj)` + `check(cnpj ~ '^[0-9]{14}$')` no Postgres (RLS ativo). O prompt pede ao modelo que não duplique, mas o banco é quem **impede**.
- **`stopWhen: stepCountIs(5)`**: disjuntor contra loop infinito de agente. 5 passos é razoável e barato.
- **Mock determinístico (Dia 5)**: `lib/mock-data.ts` usa PRNG seedado pelo id do agente. Reproduzibilidade total — toda vez que recarregar, os mesmos números aparecem.
- **Métricas vazias retornam `null`**: nunca `NaN`, nunca `0,0%` enganoso. A UI mostra "Sem dados no período".
- **Preços como EXEMPLO**: `lib/pricing.ts` tem constantes com comentário avisando "não oficiais, ajustar antes de usar". Baseline M5 (130 dias) idem — rotulada "informado por X, a validar".
- **Design system agnóstico**: nada de biblioteca de componentes. Tailwind + Geist Sans + regra de 8px. Documentado em `DESIGN.md`.
- **Zero biblioteca de gráfico**: SVG inline + Tailwind. Todo gráfico tem valores em texto ao lado (acessibilidade).

## O que é simulado vs real

| Camada | Hoje |
|---|---|
| LLM (`/chat`, `/agent`) | **Real.** Chama a API da Anthropic. Cobra crédito. |
| Supabase (`/agent`) | **Real.** Grava em `clientes` no Postgres do Supabase. |
| `/agentes/testar` | **Simulado.** `lib/mock-api.ts` com 8 cenários pré-definidos. |
| `/agentes/painel` | **Simulado.** `lib/mock-data.ts` gera clientes/agentes/execs com PRNG seedado. |
| Dados de hospital | **Simulados.** Nunca um nome ou CNPJ real. |

Faixa "Dados simulados até dd/mm/aaaa" fica fixa em todas as telas de `/agentes/*` para evitar confusão.

## Como trocar o mock pela API real

1. Fechar o contrato com o dev back-end usando [`docs/contrato-front-back.md`](docs/contrato-front-back.md).
2. Reescrever cada método de `AgentApi` em `lib/api.ts` para fazer `fetch(...)` em vez de chamar os mocks.
3. **Nada mais muda.** Nem componentes, nem telas, nem tipos.

## Limitações conhecidas

- **Mock em memória**: `lib/mock-api.ts` guarda pendências de confirmação num `Map` em memória — serverless → não sobrevive a cold start em produção. OK pra lab, não pra produção.
- **Sem i18n**: tudo em pt-BR hard-coded. OK pro escopo.
- **Sem testes automatizados**: validação é manual via `/agent` + evals em `evals/cases.json`.
- **Clipboard API**: requer HTTPS ou localhost. Em preview da Vercel funciona.
- **Fuso horário**: datas exibidas em `pt-BR` convertem via `toLocaleString`, que usa o fuso do navegador. Pode divergir entre usuários.
- **Sem rate limit**: endpoints `/api/chat` e `/api/agent` só têm passcode. Em produção, adicionar rate limit por IP.

## O que eu faria diferente

- **`globals.css` com fallback `Arial/Helvetica` sobrescreve a Geist** — notado em DESIGN.md como `[PROPOSTO]` opção A, não aplicado para não tocar em arquivo fora da lista permitida.
- **Métricas no cliente não escala** — toda agregação está no front. Para produção, mover pra endpoint `/api/cs/metricas?...`.
- **`AgentApi` como object export** — para troca por implementação real, seria mais testável como classe injetada ou módulo substituído via DI. Hoje é só pragmatismo.

## O que ainda não sei

- Convenção de paginação da empresa (cursor vs offset).
- Se o back-end já registra `createdAt`/`publishedAt` do agente (M5 depende disso).
- Política de LGPD para dados de execução contendo informação de paciente.
- Qual o `limit` máximo aceitável nas listagens de execução.

## Licença e créditos

Projeto de treino sem licença definida. Skills de design em `.claude/skills/` são de terceiros — ver `.claude/skills/LICENSE-claude-design-skills`.
