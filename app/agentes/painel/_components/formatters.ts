/**
 * Formatadores pt-BR usados no painel.
 */

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null) return "—";
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatNumberPtBr(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR");
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return `${seconds.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}s`;
  }
  return `${Math.round(ms).toLocaleString("pt-BR")} ms`;
}

export function formatRelativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export function formatCostUsd(usd: number | null): string {
  if (usd === null) return "—";
  if (usd < 0.01) return "< US$ 0,01";
  return `US$ ${usd.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Erro code → mensagem curta usada em "ação sugerida" na UI. */
export function errorActionText(code: string): string {
  switch (code) {
    case "VALIDATION":
      return "Corrigir dados e reenviar.";
    case "DUPLICATE":
      return "Consultar o cadastro existente antes de criar.";
    case "PERMISSION":
      return "Pedir ao time técnico para revisar as permissões do agente.";
    case "UNAVAILABLE":
      return "Verificar com o time técnico se há incidente de infra.";
    case "UNKNOWN":
      return "Enviar o ID da execução ao time técnico para investigação.";
    default:
      return "Investigar com o time técnico.";
  }
}
