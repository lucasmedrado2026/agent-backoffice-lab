/**
 * Camada única que a UI consome.
 * Hoje tudo é mock (importa de ./mock-api e ./mock-data).
 * Para ligar na API real amanhã: substituir cada função por `fetch(...)` sem mudar a assinatura.
 */

import type {
  AgenteRecord,
  ClienteRecord,
  ErrorCode,
  ExecutionRecord,
  RunResult,
  TraceStep,
} from "./contract";
import {
  confirmActionMock,
  runAgentMock,
  type Scenario,
} from "./mock-api";

/** Re-export para que os consumidores não precisem conhecer o mock. */
export type { Scenario } from "./mock-api";
import {
  generateExecutions,
  getAgentes,
  getClientes,
  getDataSnapshot,
} from "./mock-data";

export type ListExecutionsOptions = {
  /** Dias no passado a considerar. Padrão: 30. */
  days?: number;
  /** Filtrar por cliente específico. */
  clienteId?: string;
  /** Filtrar por agente específico. */
  agenteId?: string;
};

export const AgentApi = {
  /* ─── Operações já existentes do Dia 4 (delegadas) ─── */
  runAgent: (message: string, scenario: Scenario = "sucesso") =>
    runAgentMock(message, scenario),
  confirmAction: (runId: string, accept: boolean) =>
    confirmActionMock(runId, accept),

  /* ─── Leituras para o painel do Dia 5 ─── */
  async listClientes(): Promise<ClienteRecord[]> {
    return getClientes();
  },

  async listAgentes(opts?: { clienteId?: string }): Promise<AgenteRecord[]> {
    const all = getAgentes();
    return opts?.clienteId
      ? all.filter((a) => a.clienteId === opts.clienteId)
      : all;
  },

  async listExecutions(
    opts: ListExecutionsOptions = {},
  ): Promise<ExecutionRecord[]> {
    const days = opts.days ?? 30;
    const now = getDataSnapshot();
    const cutoff = now.getTime() - days * 86_400_000;
    let execs = generateExecutions().filter(
      (e) => Date.parse(e.startedAt) >= cutoff,
    );
    if (opts.clienteId)
      execs = execs.filter((e) => e.clienteId === opts.clienteId);
    if (opts.agenteId)
      execs = execs.filter((e) => e.agenteId === opts.agenteId);
    return execs;
  },

  /** P2 — reconstrói determinísticamente um RunResult a partir do registro. */
  async getExecution(runId: string): Promise<RunResult | null> {
    const rec = generateExecutions().find((e) => e.id === runId);
    if (!rec) return null;
    return executionToRunResult(rec);
  },

  /** Data em que os dados fictícios foram "congelados". */
  async getDataSnapshotIso(): Promise<string> {
    return getDataSnapshot().toISOString();
  },
};

function executionToRunResult(rec: ExecutionRecord): RunResult {
  const steps: TraceStep[] = [];

  rec.toolsUsed.forEach((tool, idx) => {
    const isSuccess = rec.status === "success";
    const input =
      tool === "cadastrarCliente"
        ? { nome: "Hospital Teste", cnpj: "11222333000181" }
        : {};
    const result = isSuccess
      ? ({
          ok: true as const,
          data:
            tool === "cadastrarCliente"
              ? {
                  id: `mock-${rec.id}`,
                  nome: "Hospital Teste",
                  cnpj: "11222333000181",
                }
              : { clientes: [] },
        })
      : ({
          ok: false as const,
          code: rec.errorCode ?? "UNKNOWN",
          message: errorMessage(rec.errorCode ?? "UNKNOWN"),
          retryable: isRetryable(rec.errorCode ?? "UNKNOWN"),
        });
    steps.push({
      index: idx + 1,
      kind: "tool",
      toolName: tool,
      input,
      result,
    });
  });

  const finalText = finalTextForStatus(rec);
  steps.push({
    index: steps.length + 1,
    kind: "text",
    text: finalText,
  });

  return {
    runId: rec.id,
    status: rec.status,
    finalText,
    steps,
    dataChanged: rec.dataChanged,
    usage: rec.usage,
    latencyMs: rec.latencyMs,
  };
}

function finalTextForStatus(rec: ExecutionRecord): string {
  if (rec.status === "success") return "Ação concluída.";
  if (rec.status === "needs_input")
    return "Preciso de mais informações para continuar.";
  if (rec.status === "awaiting_confirmation")
    return "Aguardando sua confirmação.";
  return errorMessage(rec.errorCode ?? "UNKNOWN");
}

function errorMessage(code: ErrorCode): string {
  switch (code) {
    case "VALIDATION":
      return "Algum dado informado não é válido.";
    case "DUPLICATE":
      return "Já existe um cliente com esse CNPJ.";
    case "PERMISSION":
      return "Este agente não tem permissão para essa ação.";
    case "UNAVAILABLE":
      return "O sistema está indisponível agora.";
    case "UNKNOWN":
      return "Algo deu errado e a causa não foi identificada.";
  }
}

function isRetryable(code: ErrorCode): boolean {
  return code === "VALIDATION" || code === "UNAVAILABLE";
}
