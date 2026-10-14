/**
 * Back-end simulado. SEM rede, SEM Supabase, SEM AI SDK.
 * Permite projetar todos os estados antes de ter o back-end real.
 */

import type { RunResult, PendingAction, TraceStep } from "./contract";

export type Scenario =
  | "sucesso"
  | "cnpj_duplicado"
  | "sem_permissao"
  | "indisponivel"
  | "erro_desconhecido"
  | "pede_dado"
  | "lento"
  | "confirmacao";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const genRunId = () =>
  `run_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

// Mantém pendências de confirmação em memória (apenas no servidor Node de dev).
const pendingRuns = new Map<string, { action: PendingAction; createdAt: number }>();

export async function runAgentMock(
  message: string,
  scenario: Scenario,
): Promise<RunResult> {
  const startedAt = Date.now();

  switch (scenario) {
    case "sucesso": {
      await delay(1200);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "tool",
          toolName: "cadastrarCliente",
          input: { nome: "Hospital Teste Alfa", cnpj: "11222333000181" },
          result: {
            ok: true,
            data: {
              id: "mock-9f8e-aaaa-1111",
              nome: "Hospital Teste Alfa",
              cnpj: "11222333000181",
            },
          },
        },
        {
          index: 2,
          kind: "text",
          text: "O Hospital Teste Alfa foi cadastrado com sucesso.",
        },
      ];
      return {
        runId: genRunId(),
        status: "success",
        finalText: steps[1].text ?? "",
        steps,
        dataChanged: true,
        usage: { inputTokens: 980, outputTokens: 120 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "cnpj_duplicado": {
      await delay(900);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "tool",
          toolName: "cadastrarCliente",
          input: { nome: "Hospital Teste Alfa", cnpj: "11222333000181" },
          result: {
            ok: false,
            code: "DUPLICATE",
            message: "Já existe um cliente com esse CNPJ.",
            retryable: false,
          },
        },
      ];
      return {
        runId: genRunId(),
        status: "error",
        finalText: "Já existe um cliente com esse CNPJ.",
        steps,
        dataChanged: false,
        usage: { inputTokens: 950, outputTokens: 60 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "sem_permissao": {
      await delay(700);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "tool",
          toolName: "cadastrarCliente",
          input: { nome: "Hospital Teste Alfa", cnpj: "11222333000181" },
          result: {
            ok: false,
            code: "PERMISSION",
            message: "Este agente não tem permissão para essa ação.",
            retryable: false,
          },
        },
      ];
      return {
        runId: genRunId(),
        status: "error",
        finalText: "Este agente não tem permissão para essa ação.",
        steps,
        dataChanged: false,
        usage: { inputTokens: 920, outputTokens: 40 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "indisponivel": {
      await delay(600);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "tool",
          toolName: "listarClientes",
          input: {},
          result: {
            ok: false,
            code: "UNAVAILABLE",
            message: "O sistema está indisponível agora.",
            retryable: true,
          },
        },
      ];
      return {
        runId: genRunId(),
        status: "error",
        finalText: "O sistema está indisponível agora.",
        steps,
        dataChanged: false,
        usage: { inputTokens: 890, outputTokens: 30 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "erro_desconhecido": {
      await delay(800);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "tool",
          toolName: "cadastrarCliente",
          input: { nome: "Hospital Teste Alfa", cnpj: "11222333000181" },
          result: {
            ok: false,
            code: "UNKNOWN",
            message: "Algo deu errado e a causa não foi identificada.",
            retryable: false,
          },
        },
      ];
      return {
        runId: genRunId(),
        status: "error",
        finalText: "Algo deu errado e a causa não foi identificada.",
        steps,
        dataChanged: false,
        usage: { inputTokens: 910, outputTokens: 50 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "pede_dado": {
      await delay(900);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "text",
          text: "Para cadastrar o Hospital Beta, qual é o CNPJ? Pode ser com ou sem pontuação.",
        },
      ];
      return {
        runId: genRunId(),
        status: "needs_input",
        finalText: steps[0].text ?? "",
        steps,
        dataChanged: false,
        usage: { inputTokens: 850, outputTokens: 70 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "lento": {
      await delay(4500);
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "tool",
          toolName: "cadastrarCliente",
          input: { nome: "Hospital Teste Delta", cnpj: "99888777000166" },
          result: {
            ok: true,
            data: {
              id: "mock-slow-dddd-9999",
              nome: "Hospital Teste Delta",
              cnpj: "99888777000166",
            },
          },
        },
        {
          index: 2,
          kind: "text",
          text: "O Hospital Teste Delta foi cadastrado com sucesso.",
        },
      ];
      return {
        runId: genRunId(),
        status: "success",
        finalText: steps[1].text ?? "",
        steps,
        dataChanged: true,
        usage: { inputTokens: 1020, outputTokens: 130 },
        latencyMs: Date.now() - startedAt,
      };
    }

    case "confirmacao": {
      await delay(1000);
      const action: PendingAction = {
        toolName: "cadastrarCliente",
        input: { nome: "Hospital Teste Gama", cnpj: "11555888000142" },
        summary:
          "Cadastrar o Hospital Teste Gama (CNPJ 11.555.888/0001-42) como novo cliente.",
      };
      const runId = genRunId();
      pendingRuns.set(runId, { action, createdAt: Date.now() });
      const steps: TraceStep[] = [
        {
          index: 1,
          kind: "text",
          text: "Antes de cadastrar, preciso da sua confirmação.",
        },
      ];
      return {
        runId,
        status: "awaiting_confirmation",
        finalText: steps[0].text ?? "",
        steps,
        dataChanged: false,
        pendingAction: action,
        usage: { inputTokens: 870, outputTokens: 55 },
        latencyMs: Date.now() - startedAt,
      };
    }
  }

  // Fallback estático (nunca deve rodar — exhaustive switch acima).
  throw new Error(`Cenário desconhecido: ${scenario}`);
}

export async function confirmActionMock(
  runId: string,
  accept: boolean,
): Promise<RunResult> {
  const startedAt = Date.now();
  const pending = pendingRuns.get(runId);
  await delay(900);

  if (!pending) {
    const steps: TraceStep[] = [
      {
        index: 1,
        kind: "tool",
        toolName: "cadastrarCliente",
        input: {},
        result: {
          ok: false,
          code: "UNKNOWN",
          message: "Algo deu errado e a causa não foi identificada.",
          retryable: false,
        },
      },
    ];
    return {
      runId,
      status: "error",
      finalText:
        "Não foi possível encontrar a ação pendente — talvez a sessão tenha expirado.",
      steps,
      dataChanged: false,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startedAt,
    };
  }

  pendingRuns.delete(runId);

  if (!accept) {
    const steps: TraceStep[] = [
      {
        index: 1,
        kind: "text",
        text: "Ação cancelada. Nenhum dado foi alterado.",
      },
    ];
    return {
      runId,
      status: "success",
      finalText: steps[0].text ?? "",
      steps,
      dataChanged: false,
      usage: { inputTokens: 0, outputTokens: 20 },
      latencyMs: Date.now() - startedAt,
    };
  }

  // accept === true → executa a ação pendente (simulado como sucesso).
  const steps: TraceStep[] = [
    {
      index: 1,
      kind: "tool",
      toolName: "cadastrarCliente",
      input: pending.action.input,
      result: {
        ok: true,
        data: {
          id: "mock-confirmed-cccc-1111",
          ...(pending.action.input as Record<string, unknown>),
        },
      },
    },
    {
      index: 2,
      kind: "text",
      text: "Cliente cadastrado com sucesso.",
    },
  ];
  return {
    runId,
    status: "success",
    finalText: steps[1].text ?? "",
    steps,
    dataChanged: true,
    usage: { inputTokens: 940, outputTokens: 90 },
    latencyMs: Date.now() - startedAt,
  };
}
