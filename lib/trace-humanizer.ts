/**
 * Converte os passos técnicos do agente em frases que o CS entende.
 * Funções puras — sem side effects, sem rede, sem storage.
 */

import type { ErrorCode, TraceStep, ToolResult } from "./contract";

/** Formata 14 dígitos em "XX.XXX.XXX/XXXX-XX". Retorna o original se não tiver 14 dígitos. */
export function formatCNPJ(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return raw;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/** Mensagem e ação sugerida por código de erro — fonte de verdade do copy. */
export function humanizeError(code: ErrorCode): {
  message: string;
  action: string;
} {
  switch (code) {
    case "VALIDATION":
      return {
        message: "Algum dado informado não é válido.",
        action: "Corrigir e reenviar.",
      };
    case "DUPLICATE":
      return {
        message: "Já existe um cliente com esse CNPJ.",
        action: "Consultar o cadastro existente.",
      };
    case "PERMISSION":
      return {
        message: "Este agente não tem permissão para essa ação.",
        action: "Avisar o time técnico.",
      };
    case "UNAVAILABLE":
      return {
        message: "O sistema está indisponível agora.",
        action: "Tentar de novo em instantes.",
      };
    case "UNKNOWN":
      return {
        message: "Algo deu errado e a causa não foi identificada.",
        action: "Copiar o ID da execução e enviar ao time técnico.",
      };
  }
}

/** Transforma um passo do rastro em título + descrição legíveis. */
export function humanizeStep(step: TraceStep): {
  title: string;
  detail: string;
} {
  if (step.kind === "text") {
    return {
      title: "Agente respondeu",
      detail: step.text ?? "",
    };
  }

  // step.kind === "tool"
  if (step.toolName === "cadastrarCliente") {
    const input = (step.input ?? {}) as { nome?: string; cnpj?: string };
    const nome = input.nome ?? "cliente";
    const cnpj = input.cnpj ? formatCNPJ(input.cnpj) : "sem CNPJ";
    const title = `Cadastrar o cliente ${nome} (CNPJ ${cnpj})`;
    const detail = detailFromResult(step.result, {
      okFallback: "Cliente cadastrado com sucesso.",
    });
    return { title, detail };
  }

  if (step.toolName === "listarClientes") {
    const title = "Consultar a lista de clientes";
    const detail = detailFromResult(step.result, {
      okFallback: "Consulta concluída.",
      okMapper: (data) => {
        if (Array.isArray(data)) {
          if (data.length === 0) return "Nenhum cliente cadastrado ainda.";
          return `${data.length} ${data.length === 1 ? "cliente encontrado" : "clientes encontrados"}.`;
        }
        if (data && typeof data === "object" && "clientes" in data) {
          const clientes = (data as { clientes: unknown }).clientes;
          if (Array.isArray(clientes)) {
            if (clientes.length === 0) return "Nenhum cliente cadastrado ainda.";
            return `${clientes.length} ${clientes.length === 1 ? "cliente encontrado" : "clientes encontrados"}.`;
          }
        }
        return "Consulta concluída.";
      },
    });
    return { title, detail };
  }

  return { title: "Ação do agente", detail: "" };
}

function detailFromResult(
  result: ToolResult<unknown> | undefined,
  opts: {
    okFallback: string;
    okMapper?: (data: unknown) => string;
  },
): string {
  if (!result) return "";
  if (result.ok) {
    return opts.okMapper ? opts.okMapper(result.data) : opts.okFallback;
  }
  const human = humanizeError(result.code);
  return `${human.message} ${human.action}`;
}
