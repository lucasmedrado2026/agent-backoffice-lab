/**
 * Preços de EXEMPLO, não oficiais; ajustar antes de usar.
 * Baseados em uma estimativa pública aproximada do Claude Haiku 5.5
 * (US$1/MI de tokens de entrada, US$5/MI de tokens de saída). Confira
 * os valores reais em https://www.anthropic.com/pricing antes de confiar.
 */

export const PRICING = {
  modelo: "claude-haiku-5-5",
  /** Preço de EXEMPLO em USD por 1 milhão de tokens de entrada. */
  inputUsdPerMillion: 1.0,
  /** Preço de EXEMPLO em USD por 1 milhão de tokens de saída. */
  outputUsdPerMillion: 5.0,
} as const;

export function estimateCostUsd(usage: {
  inputTokens: number;
  outputTokens: number;
}): number {
  const inputCost = (usage.inputTokens * PRICING.inputUsdPerMillion) / 1_000_000;
  const outputCost =
    (usage.outputTokens * PRICING.outputUsdPerMillion) / 1_000_000;
  return inputCost + outputCost;
}

/** Formata USD em BRL com câmbio FIXO só para exibição. Marcar como estimativa. */
export const EXAMPLE_USD_TO_BRL = 5.0; // câmbio de EXEMPLO; não é cotação real.

export function estimateCostBrl(usage: {
  inputTokens: number;
  outputTokens: number;
}): number {
  return estimateCostUsd(usage) * EXAMPLE_USD_TO_BRL;
}
