# Evals — como testar o agente

## O que é um eval

**Eval** = conjunto de casos de teste para o comportamento de um agente ou LLM. Diferente de teste de código ("essa função retorna 42?"), um eval mede **respostas e decisões**: o agente chamou a tool certa? Pediu esclarecimento quando devia? Recusou o que não podia fazer?

Dois motivos para ter eval desde cedo:

1. **Comparar versões** — quando trocar o system prompt, modelo ou tool description, você compara os mesmos casos antes/depois.
2. **Catar regressão** — quando o modelo for atualizado (ex.: Haiku 5.6), você roda os evals para ver se algo quebrou silenciosamente.

## Como rodar MANUALMENTE (hoje)

Os casos estão em [`evals/cases.json`](../evals/cases.json). Cada caso tem:

- `id`: identificador
- `input`: a mensagem que você vai digitar
- `expect.toolCalled`: qual tool você espera que seja chamada (ou `null`)
- `expect.shouldAskUser`: deveria pedir mais informação ao usuário
- `expect.shouldRefuse`: deveria recusar a ação
- `expect.notes`: critério de pass/fail detalhado

**Roteiro:**

1. Abra `/agent` local (http://localhost:3000/agent) ou em produção.
2. Para cada caso em `cases.json`:
   - Copie `input` → cole no campo "Mensagem"
   - Clique Enviar
   - Olhe o **Rastro do agente**
   - Confira contra `expect.notes`
3. Anote o resultado numa planilha ou no README do seu PR:

| id | passou? | o que aconteceu | observação |
|---|---|---|---|
| eval-01-cadastro-valido | ✓ | chamou cadastrarCliente, cadastrou | — |
| eval-03-cnpj-ausente | ✕ | chamou cadastrarCliente com CNPJ inventado "00000000000000" | prompt precisa reforçar "nunca inventar" |
| ... | ... | ... | ... |

### Dica de custo
- Modelo barato (Haiku) + 8 casos = ~US$ 0,02 a US$ 0,05 por rodada completa.
- Cuidado com repetir rodada no dia da fatura ser cortada — pode acumular US$ 1 em pouco tempo se automatizar sem atenção.

## O que automatizar depois (quando valer o esforço)

Quando você rodar o mesmo eval mais que ~3 vezes por semana manualmente, vale automatizar. Rota sugerida:

### Opção A — Script Node simples
Criar `scripts/run-evals.ts` que:
1. Lê `cases.json`.
2. Para cada caso, faz `fetch("http://localhost:3000/api/agent", { body: input })`.
3. Compara `result.steps` com `expect.toolCalled` e flags.
4. Imprime passou/falhou + diff.

Prós: zero dependência nova, roda com `tsx scripts/run-evals.ts`.
Contras: comparação por regra programática — não captura "o modelo respondeu bem" subjetivo.

### Opção B — LLM-as-judge
Para critérios subjetivos ("a resposta foi clara?", "respeitou o tom?"), chamar outro LLM (Haiku) com:
- `input` original
- `output` do agente
- Critério em texto
- Pedindo nota 1–5 com justificativa

Vale quando o critério é "qualidade do texto", não "chamou a tool certa".

### Opção C — Plataforma pronta
Promptfoo, LangSmith, Braintrust — frameworks com dashboards de regressão. Vale quando você tiver >50 casos, >1 modelo, ou >1 pessoa olhando.

## Pré-requisitos para rodar os casos atuais

- `.env.local` configurado com `ANTHROPIC_API_KEY` e `APP_PASSCODE`.
- Supabase conectado (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), com a tabela `clientes` existente.
- Para `eval-02`: o Hospital Teste Alfa (CNPJ 11222333000181) **deve** já estar cadastrado. Se não estiver, rode o `eval-01` primeiro usando esse CNPJ, ou cadastre via `/agent` manualmente.
- Para rodar sem estourar fatura: configure limite de gasto mensal baixo no console da Anthropic (`https://console.anthropic.com`).

## O que o Dia 5 explicitamente NÃO automatiza

- Não há script `npm run evals` nem CI que chame a API da Anthropic. O gasto fica **sob controle manual** do dono do repo.
- A chave da Anthropic nunca aparece nos cases nem no doc.

## Hipóteses sobre comportamento (a validar na rodada)

- `eval-03` (CNPJ ausente): modelos atuais do Haiku **tendem** a pedir o CNPJ. Se um modelo novo começar a inventar, o system prompt precisa ser reforçado.
- `eval-07` (apagar): o agente só tem `cadastrarCliente` e `listarClientes`. A descrição não menciona apagar — espera-se que o modelo entenda que "não tem essa capacidade".
- `eval-08` (injeção): a defesa real está no `zod.inputSchema` (exige `cnpj` como string); a defesa no prompt é a segunda linha. Se a validação da tool for ignorada, é falha de código, não de prompt.
