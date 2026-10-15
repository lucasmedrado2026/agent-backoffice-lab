/**
 * Dados fictícios DETERMINÍSTICOS do painel.
 * Nenhum hospital real, nenhum dado de paciente. Nada sai desta função.
 * O seed é derivado do id do agente para reproduzibilidade.
 */

import type {
  AgenteRecord,
  ClienteRecord,
  ErrorCode,
  ExecutionRecord,
  RunStatus,
} from "./contract";

const CLIENTES: ClienteRecord[] = [
  {
    id: "cli-1",
    nome: "Hospital Teste Alfa",
    cnpj: "11222333000181",
    createdAt: "2026-08-15T10:00:00Z",
  },
  {
    id: "cli-2",
    nome: "Hospital Teste Beta",
    cnpj: "11444777000161",
    createdAt: "2026-07-20T10:00:00Z",
  },
  {
    id: "cli-3",
    nome: "Hospital Teste Gama",
    cnpj: "11555888000142",
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "cli-4",
    nome: "Hospital Teste Delta",
    cnpj: "99888777000166",
    createdAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "cli-5",
    nome: "Hospital Teste Epsilon",
    cnpj: "33444555000199",
    createdAt: "2026-06-10T10:00:00Z",
  },
];

const AGENTES: AgenteRecord[] = [
  {
    id: "age-1a",
    clienteId: "cli-1",
    nome: "Cadastro Alfa",
    status: "no_ar",
    createdAt: "2026-08-16T10:00:00Z",
    publishedAt: "2026-08-25T10:00:00Z",
    createdBy: "cs",
  },
  {
    id: "age-1b",
    clienteId: "cli-1",
    nome: "Suporte Alfa",
    status: "em_implantacao",
    createdAt: "2026-09-10T10:00:00Z",
    publishedAt: null,
    createdBy: "cs",
  },
  {
    id: "age-2a",
    clienteId: "cli-2",
    nome: "Cadastro Beta",
    status: "no_ar",
    createdAt: "2026-07-21T10:00:00Z",
    publishedAt: "2026-08-10T10:00:00Z",
    createdBy: "dev",
  },
  {
    id: "age-3a",
    clienteId: "cli-3",
    nome: "Cadastro Gama",
    status: "no_ar",
    createdAt: "2026-05-02T10:00:00Z",
    publishedAt: "2026-05-20T10:00:00Z",
    createdBy: "cs",
  },
  {
    id: "age-3b",
    clienteId: "cli-3",
    nome: "Agendamento Gama",
    status: "no_ar",
    createdAt: "2026-06-15T10:00:00Z",
    publishedAt: "2026-07-05T10:00:00Z",
    createdBy: "cs",
  },
  {
    id: "age-4a",
    clienteId: "cli-4",
    nome: "Cadastro Delta",
    status: "em_implantacao",
    createdAt: "2026-09-02T10:00:00Z",
    publishedAt: null,
    createdBy: "dev",
  },
  {
    id: "age-5a",
    clienteId: "cli-5",
    nome: "Cadastro Epsilon",
    status: "no_ar",
    createdAt: "2026-06-11T10:00:00Z",
    publishedAt: "2026-07-01T10:00:00Z",
    createdBy: "cs",
  },
];

/** PRNG determinístico (mulberry32). */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash estável de string → inteiro, para seedar o PRNG. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const DATA_SNAPSHOT_ISO = "2026-10-15T12:00:00Z";

/** Data base dos dados simulados (fica fixa, para o dashboard ser determinístico). */
export function getDataSnapshot(): Date {
  return new Date(DATA_SNAPSHOT_ISO);
}

export function getClientes(): ClienteRecord[] {
  return [...CLIENTES];
}

export function getAgentes(): AgenteRecord[] {
  return [...AGENTES];
}

const ERRORS: ErrorCode[] = [
  "VALIDATION",
  "DUPLICATE",
  "PERMISSION",
  "UNAVAILABLE",
  "UNKNOWN",
];

/**
 * Gera execuções fictícias para todos os agentes com status "no_ar".
 * Determinístico: mesma entrada = mesma saída.
 */
export function generateExecutions(): ExecutionRecord[] {
  const execs: ExecutionRecord[] = [];
  const nowMs = getDataSnapshot().getTime();

  for (const agente of AGENTES.filter((a) => a.status === "no_ar")) {
    const rand = prng(hashSeed(agente.id));
    const count = 20 + Math.floor(rand() * 80); // 20..99 execs
    for (let i = 0; i < count; i++) {
      const roll = rand();
      let status: RunStatus;
      let errorCode: ErrorCode | undefined;
      let dataChanged = false;
      let confirmation: "accepted" | "rejected" | null = null;
      let toolsUsed: ("cadastrarCliente" | "listarClientes")[] = [];

      if (roll < 0.72) {
        status = "success";
        const action = rand() < 0.4 ? "listar" : "cadastrar";
        if (action === "cadastrar") {
          toolsUsed = ["cadastrarCliente"];
          dataChanged = true;
          if (rand() < 0.3) confirmation = rand() < 0.8 ? "accepted" : "rejected";
        } else {
          toolsUsed = ["listarClientes"];
        }
      } else if (roll < 0.85) {
        status = "needs_input";
      } else if (roll < 0.9) {
        status = "awaiting_confirmation";
        confirmation = rand() < 0.7 ? "accepted" : "rejected";
      } else {
        status = "error";
        errorCode = ERRORS[Math.floor(rand() * ERRORS.length)];
        toolsUsed = ["cadastrarCliente"];
      }

      const latency = 500 + Math.floor(rand() * 7000);
      const daysAgo = Math.floor(rand() * 30);
      const extraSeconds = Math.floor(rand() * 86400);
      const startedAt = new Date(
        nowMs - daysAgo * 86_400_000 - extraSeconds * 1000,
      ).toISOString();

      execs.push({
        id: `exec-${agente.id}-${i}`,
        agenteId: agente.id,
        clienteId: agente.clienteId,
        startedAt,
        latencyMs: latency,
        status,
        errorCode,
        toolsUsed,
        dataChanged,
        confirmation,
        usage: {
          inputTokens: 800 + Math.floor(rand() * 1500),
          outputTokens: 40 + Math.floor(rand() * 200),
        },
      });
    }
  }

  return execs.sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0,
  );
}
