/**
 * Contrato tipado entre front-end do CS e back-end (hoje mock, amanhã real).
 * Qualquer back-end que implemente este contrato pode trocar o mock sem mexer na UI.
 */

/** Código estável de erro. O copy humano fica na tabela de erros (trace-humanizer). */
export type ErrorCode =
  | "VALIDATION"
  | "DUPLICATE"
  | "PERMISSION"
  | "UNAVAILABLE"
  | "UNKNOWN";

/**
 * Resultado de uma tool. Discriminated union: use `result.ok` para destravar o tipo.
 * `retryable` diz se um botão "Tentar de novo" faz sentido.
 */
export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; retryable: boolean };

/** Um passo do rastro do agente. Pode ser uma chamada de tool OU um texto do modelo. */
export type TraceStep = {
  /** Índice do passo (1-based) na execução. */
  index: number;
  /** "tool" = chamou ferramenta; "text" = modelo respondeu em linguagem natural. */
  kind: "tool" | "text";
  /** Nome da tool chamada (só quando kind === "tool"). */
  toolName?: "cadastrarCliente" | "listarClientes";
  /** Argumentos passados para a tool (só quando kind === "tool"). */
  input?: unknown;
  /** Resultado retornado pela tool (só quando kind === "tool"). */
  result?: ToolResult<unknown>;
  /** Texto que o modelo escreveu (só quando kind === "text"). */
  text?: string;
};

/** Em qual situação a execução terminou. É o status que dirige o banner da UI. */
export type RunStatus =
  | "success"
  | "needs_input"
  | "awaiting_confirmation"
  | "error";

/** Ação pendente de confirmação do usuário (status === "awaiting_confirmation"). */
export type PendingAction = {
  /** Nome da tool que será executada se o usuário confirmar. */
  toolName: string;
  /** Argumentos que serão enviados. */
  input: unknown;
  /** Frase legível para o CS: "Cadastrar o Hospital X com CNPJ ...". */
  summary: string;
};

/**
 * Envelope de uma execução do agente. Tudo que a UI precisa para desenhar o resultado.
 * - `dataChanged`: existe porque o CS precisa saber EM UM OLHAR se algo foi gravado no sistema.
 *   Status "success" com `dataChanged: false` (ex.: listar) é diferente de "success" com `true` (ex.: cadastrar).
 *   Status "error" é SEMPRE `dataChanged: false`.
 */
export type RunResult = {
  /** ID único da execução — mostrado quando há erro, para o CS enviar ao time técnico. */
  runId: string;
  /** Situação final da execução. */
  status: RunStatus;
  /** Texto final que o modelo mandou para o usuário. */
  finalText: string;
  /** Lista completa de passos (humanizada em outra camada). */
  steps: TraceStep[];
  /** Houve escrita no sistema? Usado pelo banner "Dados alterados / Nenhum dado foi alterado". */
  dataChanged: boolean;
  /** Preenchido só quando status === "awaiting_confirmation". */
  pendingAction?: PendingAction;
  /** Contagem de tokens — só exibida em "Detalhes técnicos". */
  usage: { inputTokens: number; outputTokens: number };
  /** Tempo total em milissegundos — só exibido em "Detalhes técnicos". */
  latencyMs: number;
};
