/**
 * Funções puras de cálculo das métricas M1-M6 do Dia 5.
 * Vazio nunca vira NaN: retornam null quando não há dados.
 */

import type {
  AgenteRecord,
  ErrorCode,
  ExecutionRecord,
} from "./contract";

/** Referência informada pelo PM da empresa; a validar. */
export const BASELINE_DIAS_ATE_NO_AR = 130;

/** Limite [PROPOSTO] de p95 para alerta visual na UI. */
export const P95_LIMITE_MS = 5000;

/** M1 — taxa de sucesso: success / total. Null se vazio. */
export function successRate(execs: ExecutionRecord[]): number | null {
  if (execs.length === 0) return null;
  const ok = execs.filter((e) => e.status === "success").length;
  return ok / execs.length;
}

/** M2 — distribuição de erros por code. Null se não houver erros. */
export function errorsByCode(
  execs: ExecutionRecord[],
): Record<ErrorCode, number> | null {
  const errors = execs.filter(
    (e): e is ExecutionRecord & { errorCode: ErrorCode } =>
      e.status === "error" && e.errorCode !== undefined,
  );
  if (errors.length === 0) return null;
  const base: Record<ErrorCode, number> = {
    VALIDATION: 0,
    DUPLICATE: 0,
    PERMISSION: 0,
    UNAVAILABLE: 0,
    UNKNOWN: 0,
  };
  for (const e of errors) base[e.errorCode] += 1;
  return base;
}

/** Erro mais frequente — para a coluna "Erro mais frequente" da tabela de clientes. */
export function mostFrequentError(
  execs: ExecutionRecord[],
): ErrorCode | null {
  const dist = errorsByCode(execs);
  if (!dist) return null;
  const entries = Object.entries(dist) as [ErrorCode, number][];
  entries.sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === 0) return null;
  return entries[0][0];
}

/**
 * M3 — percentil nearest-rank.
 * Fórmula: `rank = ceil(p/100 * N)` com N = quantidade de valores, após ordenar.
 * Retorna o valor na posição `rank` (1-indexed). Null se vazio.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.max(1, Math.min(rank, sorted.length)) - 1;
  return sorted[index];
}

/**
 * M5 — dias entre criação e publicação.
 * Se publishedAt é null, retorna dias desde a criação até agora (ainda em implantação).
 * Null se createdAt for inválido.
 */
export function daysToPublish(
  agente: AgenteRecord,
  now: Date = new Date(),
): number | null {
  const startMs = Date.parse(agente.createdAt);
  if (Number.isNaN(startMs)) return null;
  const endMs = agente.publishedAt
    ? Date.parse(agente.publishedAt)
    : now.getTime();
  if (Number.isNaN(endMs)) return null;
  return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000));
}

/** M5 — % de agentes criados pelo CS. Null se não houver agentes. */
export function csAuthoredRatio(agentes: AgenteRecord[]): number | null {
  if (agentes.length === 0) return null;
  return agentes.filter((a) => a.createdBy === "cs").length / agentes.length;
}

/** M6 — confirmações aceitas × canceladas. Null se não houver confirmações. */
export function confirmRatio(
  execs: ExecutionRecord[],
): { accepted: number; rejected: number } | null {
  const confirms = execs.filter(
    (e) => e.confirmation === "accepted" || e.confirmation === "rejected",
  );
  if (confirms.length === 0) return null;
  const accepted = confirms.filter((e) => e.confirmation === "accepted").length;
  const rejected = confirms.filter((e) => e.confirmation === "rejected").length;
  return { accepted, rejected };
}

/** M6 — % de execuções que alteraram dados. Null se não houver execuções. */
export function dataChangedRatio(execs: ExecutionRecord[]): number | null {
  if (execs.length === 0) return null;
  return execs.filter((e) => e.dataChanged).length / execs.length;
}
