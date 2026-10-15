# Contrato front ↔ back-end — agent-backoffice-lab

> **PROPOSTA do front, a validar com o time de back-end; nada aqui reflete a arquitetura real da empresa.**
>
> Projeto fictício de treino. Dados simulados. Nenhum número ou endpoint aqui veio de sistema de produção.

---

## 1. Objetivo

Padronizar o envelope de **execução de agente** que o front consome, para que a UI do CS funcione contra qualquer back-end que respeite o contrato — hoje é mock (`lib/mock-api.ts` + `lib/mock-data.ts`), amanhã pode ser a API real sem nenhuma mudança na UI.

Critério de sucesso do contrato: trocar a implementação de `lib/api.ts` para `fetch(...)` resolve a integração — **sem** mudar componentes da tela.

---

## 2. Tipos (TypeScript) — fonte de verdade: `lib/contract.ts`

```ts
export type ErrorCode =
  | "VALIDATION"
  | "DUPLICATE"
  | "PERMISSION"
  | "UNAVAILABLE"
  | "UNKNOWN";

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; retryable: boolean };

export type TraceStep = {
  index: number;
  kind: "tool" | "text";
  toolName?: "cadastrarCliente" | "listarClientes";
  input?: unknown;
  result?: ToolResult<unknown>;
  text?: string;
};

export type RunStatus =
  | "success"
  | "needs_input"
  | "awaiting_confirmation"
  | "error";

export type PendingAction = {
  toolName: string;
  input: unknown;
  summary: string;
};

export type RunResult = {
  runId: string;
  status: RunStatus;
  finalText: string;
  steps: TraceStep[];
  dataChanged: boolean;      // crítico pra UI do CS
  pendingAction?: PendingAction;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
};
```

E, para o painel (também em `lib/contract.ts`): `ClienteRecord`, `AgenteRecord` (com `createdAt`, `publishedAt`, `createdBy`), `ExecutionRecord`, `AgentConfig`.

---

## 3. Máquina de estados de uma execução

```
                   ┌──────────────────┐
     [POST /run]───▶   needs_input    ◀───┐
                   └────────┬─────────┘   │
                            │ user reply   │
                            ▼              │
                   ┌──────────────────┐   │
                   │ awaiting_        │   │
                   │ confirmation     │   │
                   └────────┬─────────┘   │
            accept=false    │ accept=true │
                   ┌────────┴─────────┐   │
                   ▼                  ▼   │
            success                error  │
            (dataChanged?)                │
                                           │
     [POST /run] ───────────────────▶ success / error (sem intermediário)
```

Transições e invariantes:
- `error` **sempre** vem com `dataChanged: false`.
- `success` pode vir com `dataChanged: true` (cadastro) ou `false` (listagem, cancelamento de confirmação).
- `needs_input` e `awaiting_confirmation` são estados "em espera" — o front precisa saber que a execução **não terminou** (há uma próxima chamada).
- `runId` é **estável** da criação até o fim: mesmo ID em `/run`, `/confirm`, `/execution/{id}`.

---

## 4. Tabela de erros (fonte de verdade: `lib/trace-humanizer.ts`)

| Code         | Mensagem exibida ao usuário                          | Ação sugerida ao CS                               | Retryable |
|--------------|------------------------------------------------------|---------------------------------------------------|-----------|
| `VALIDATION` | Algum dado informado não é válido.                   | Corrigir e reenviar.                              | sim       |
| `DUPLICATE`  | Já existe um cliente com esse CNPJ.                  | Consultar o cadastro existente.                   | não       |
| `PERMISSION` | Este agente não tem permissão para essa ação.        | Avisar o time técnico.                            | não       |
| `UNAVAILABLE`| O sistema está indisponível agora.                   | Tentar de novo em instantes.                      | sim       |
| `UNKNOWN`    | Algo deu errado e a causa não foi identificada.      | Copiar o ID da execução e enviar ao time técnico. | não       |

Regras:
- O servidor **deve** mandar `message` com o texto da coluna "Mensagem" exata. Nenhuma variação, nenhum detalhe técnico, nenhuma culpa ao usuário.
- Detalhe real do erro (stack, SQL state, etc.) fica **só em log de servidor**. Nunca no `message`.

---

## 5. Endpoints PROPOSTOS (hipótese; a confirmar com o back-end)

### 5.1 Executar o agente
`POST /api/cs/run`

Request:
```json
{
  "agenteId": "age-1a",
  "message": "Cadastre o Hospital Teste Alfa, CNPJ 11222333000181"
}
```

Response: `RunResult` (ver seção 2).

### 5.2 Confirmar / cancelar ação pendente
`POST /api/cs/run/{runId}/confirm`

Request:
```json
{ "accept": true }
```

Response: `RunResult` com o novo estado final.

**Idempotência:** confirmar o mesmo `runId` duas vezes deve dar o mesmo resultado da primeira (ver pergunta 2 abaixo).

### 5.3 Listar clientes
`GET /api/cs/clientes?limit=50&cursor=...`

Response:
```json
{
  "data": [ClienteRecord],
  "nextCursor": "opaque-string | null"
}
```

### 5.4 Listar agentes
`GET /api/cs/agentes?clienteId=cli-1&status=no_ar&limit=50&cursor=...`

Response: `{ data: AgenteRecord[], nextCursor }`.

### 5.5 Listar execuções
`GET /api/cs/execucoes?clienteId=&agenteId=&since=ISO&until=ISO&limit=50&cursor=`

Response: `{ data: ExecutionRecord[], nextCursor }`.

### 5.6 Obter uma execução
`GET /api/cs/execucoes/{runId}`

Response: `RunResult` reconstruído (como o mock faz hoje em `executionToRunResult`).

---

## 6. O que o front assume (contratos implícitos)

1. **`dataChanged` é confiável.** Se vier `true`, o CS deve acreditar que algo foi gravado; se `false`, nada foi tocado. Isso dirige o banner da tela e evita ligações desnecessárias ao dev.
2. **`runId` é estável e único.** O usuário pode copiá-lo e enviar ao time técnico — e esse ID resolve a execução ponta a ponta no back.
3. **`status` é a única fonte do estado da UI.** O front **nunca** lê `finalText` para inferir se deu certo (regra do Dia 4 que evita bug quando o copy do modelo mudar).
4. **`usage.inputTokens / outputTokens` são inteiros não-negativos.** O front pode mostrar `null` como "—"; mas se vier um número, está pronto para somar.
5. **Datas em ISO 8601 com fuso.** O front converte para pt-BR na UI.
6. **Paginação por cursor opaco.** O front não interpreta `nextCursor` — repassa como vem.

---

## 7. Perguntas abertas para o dev — não invente respostas

1. **Autenticação e permissões por perfil.** Como o front identifica o CS logado? Token (header `Authorization`)? Cookie de sessão? Cada perfil (CS, dev, admin) tem acesso diferente a `/api/cs/execucoes`? Como lidar com 401/403?

2. **Idempotência da confirmação.** `POST /confirm` com o mesmo `runId` duas vezes: resposta igual à primeira, ou erro `409 CONFLICT`? Preferência do front: igual à primeira (menos ruído na UI).

3. **Progresso de execuções lentas.** Qual o padrão para feedback em execuções > 5s: *streaming* (SSE/WebSocket enviando `TraceStep` conforme vão acontecendo) ou *polling* (`GET /execucoes/{runId}` a cada N segundos)? O painel P2 do painel assume mock, mas em produção isso é a decisão mais impactante na UX.

4. **Agregação de métricas: servidor × cliente.** As métricas M1–M6 do painel são calculadas no front hoje (sobre uma lista de `ExecutionRecord`). Para escala (milhares de execuções/dia), isso quebra. Vocês já têm um endpoint `/api/cs/metricas?clienteId=&periodo=` ou vamos construir junto?

5. **Escala e paginação.** Qual o tamanho máximo esperado em cada listagem? Vocês já têm `cursor` + `limit` padronizados em outros endpoints da empresa? Qual o `limit` máximo aceitável?

6. **Fuso horário.** Todos os ISO vêm em UTC? O front converte sozinho para America/Sao_Paulo? Ou o servidor devolve string já no fuso do usuário?

7. **Versionamento do contrato.** Como marcamos uma mudança breaking (`RunResult` v1 → v2)? Prefixo de URL (`/api/v1/cs/...`), header `Accept: application/vnd.cs.v2+json`, outro mecanismo?

8. **Ciclo de vida do agente.** O back-end **já** registra `createdAt` e `publishedAt` do agente (necessário para M5)? Se não, M5 vira estimativa manual ou vem só quando o campo existir.

9. **PRIVACIDADE — LGPD (crítico para hospital).** As entradas (`message`) e saídas (`finalText`, `result.data`) das execuções podem conter dados sensíveis de pacientes? Como esses dados são:
   - **Mascarados** antes de serem armazenados ou mostrados ao CS?
   - **Retidos** (por quanto tempo? política de expurgo?)?
   - **Auditados** (quem acessou a execução de qual paciente)?
   - **Permissionados** (um CS consegue ver execução de outro cliente)?

   Decisão sugerida pelo front: o painel do CS **nunca** mostra o conteúdo bruto da mensagem numa listagem — só o rastro humanizado. Mas isso depende de haver mascaramento confiável no back.

10. **Rate limit / quota.** Existe limite de execuções por minuto por cliente? Como o front sabe disso (header `X-RateLimit-*`)? Qual o erro apropriado (um novo `ErrorCode: "RATE_LIMITED"`)?

---

## 8. Fatos × hipóteses × recomendações

- **Fato:** `RunResult` como envelope é o que a UI já consome hoje em `/chat`, `/agent`, `/agentes/testar` e `/agentes/painel`.
- **Hipótese:** os endpoints da seção 5 são razoáveis; podem não bater com a convenção interna da empresa.
- **Recomendação:** reunir 30min com o dev back-end para percorrer as 10 perguntas e fechar o contrato antes de qualquer código real.
