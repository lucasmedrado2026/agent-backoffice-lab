"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgentApi } from "@/lib/api";
import type {
  AgenteRecord,
  ClienteRecord,
  ErrorCode,
  ExecutionRecord,
  RunResult,
} from "@/lib/contract";
import {
  BASELINE_DIAS_ATE_NO_AR,
  P95_LIMITE_MS,
  confirmRatio,
  csAuthoredRatio,
  dataChangedRatio,
  daysToPublish,
  errorsByCode,
  mostFrequentError,
  percentile,
  successRate,
} from "@/lib/metrics";
import { estimateCostUsd } from "@/lib/pricing";
import { humanizeStep } from "@/lib/trace-humanizer";

import {
  EmptyState,
  ErrorBlock,
  LoadingState,
} from "./_components/estados";
import {
  errorActionText,
  formatCostUsd,
  formatDuration,
  formatNumberPtBr,
  formatPercent,
  formatRelativeDays,
} from "./_components/formatters";

type Periodo = 7 | 14 | 30;

type LoadState =
  | { kind: "loading" }
  | {
      kind: "loaded";
      clientes: ClienteRecord[];
      agentes: AgenteRecord[];
      execucoes: ExecutionRecord[];
    }
  | { kind: "error" };

export default function PainelPage() {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos");
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RunResult | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const [clientes, agentes, execucoes] = await Promise.all([
        AgentApi.listClientes(),
        AgentApi.listAgentes(),
        AgentApi.listExecutions({
          days: periodo,
          clienteId: clienteFiltro === "todos" ? undefined : clienteFiltro,
        }),
      ]);
      setState({ kind: "loaded", clientes, agentes, execucoes });
    } catch {
      setState({ kind: "error" });
    }
  }, [periodo, clienteFiltro]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedRunId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      return;
    }
    let cancelled = false;
    AgentApi.getExecution(selectedRunId).then((r) => {
      if (!cancelled) setDetail(r);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Clientes e agentes que precisam de atenção. Última atualização dos
          dados fictícios: 15/10/2026.
        </p>
      </header>

      <Filtros
        periodo={periodo}
        onChangePeriodo={setPeriodo}
        clienteFiltro={clienteFiltro}
        onChangeCliente={setClienteFiltro}
        clientes={state.kind === "loaded" ? state.clientes : []}
      />

      {state.kind === "loading" && <LoadingState title="Painel" />}
      {state.kind === "error" && (
        <ErrorBlock title="Painel" onRetry={() => load()} />
      )}

      {state.kind === "loaded" && (
        <>
          <FaixaResumo
            agentes={state.agentes}
            clienteFiltro={clienteFiltro}
          />
          <TabelaClientes
            clientes={state.clientes}
            agentes={state.agentes}
            execucoes={state.execucoes}
            periodo={periodo}
            clienteFiltro={clienteFiltro}
          />
          <ErrosPorTipo execucoes={state.execucoes} />

          <DesempenhoPorAgente
            agentes={state.agentes}
            execucoes={state.execucoes}
            clienteFiltro={clienteFiltro}
          />
          <ConfirmacoesBloco execucoes={state.execucoes} />
          <ExecucoesRecentes
            agentes={state.agentes}
            clientes={state.clientes}
            execucoes={state.execucoes}
            selectedRunId={selectedRunId}
            onSelect={setSelectedRunId}
            onClose={() => setSelectedRunId(null)}
            detail={detail}
          />
        </>
      )}
    </main>
  );
}

/* ─────────────────── Filtros ─────────────────── */
function Filtros({
  periodo,
  onChangePeriodo,
  clienteFiltro,
  onChangeCliente,
  clientes,
}: {
  periodo: Periodo;
  onChangePeriodo: (p: Periodo) => void;
  clienteFiltro: string;
  onChangeCliente: (c: string) => void;
  clientes: ClienteRecord[];
}) {
  return (
    <section
      aria-label="Filtros"
      className="flex flex-wrap items-end gap-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="periodo" className="text-xs font-medium">
          Período
        </label>
        <select
          id="periodo"
          value={periodo}
          onChange={(e) => onChangePeriodo(Number(e.target.value) as Periodo)}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={14}>Últimos 14 dias</option>
          <option value={30}>Últimos 30 dias</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="cliente" className="text-xs font-medium">
          Cliente
        </label>
        <select
          id="cliente"
          value={clienteFiltro}
          onChange={(e) => onChangeCliente(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

/* ─────────────────── Faixa Resumo (M5 em destaque) ─────────────────── */
function FaixaResumo({
  agentes,
  clienteFiltro,
}: {
  agentes: AgenteRecord[];
  clienteFiltro: string;
}) {
  const filtered =
    clienteFiltro === "todos"
      ? agentes
      : agentes.filter((a) => a.clienteId === clienteFiltro);

  const published = filtered.filter((a) => a.publishedAt !== null);
  const dias = published
    .map((a) => daysToPublish(a))
    .filter((n): n is number => n !== null);
  const medianaDias = dias.length ? Math.round(mediana(dias)) : null;

  const csRatio = csAuthoredRatio(filtered);
  const noAr = filtered.filter((a) => a.status === "no_ar").length;
  const emImp = filtered.filter((a) => a.status === "em_implantacao").length;

  return (
    <section
      aria-label="Resumo"
      className="flex flex-col gap-6 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          Dias até entrar no ar (mediana)
        </p>
        <p className="text-5xl font-semibold tabular-nums">
          {medianaDias ?? "—"}
          <span className="ml-2 text-lg font-normal text-zinc-500">dias</span>
        </p>
        <p className="text-xs text-zinc-500">
          Referência informada pelo PM da empresa, a validar:{" "}
          <strong>{BASELINE_DIAS_ATE_NO_AR} dias</strong>.
          <br />
          Decisão: o produto está cortando o gargalo de implantação?
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">% criados pelo CS</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {formatPercent(csRatio)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Agentes no ar</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {formatNumberPtBr(noAr)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Em implantação</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {formatNumberPtBr(emImp)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function mediana(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* ─────────────────── Tabela de Clientes ─────────────────── */
type MotivoAtencao = {
  texto: string;
  nivel: "alto" | "medio" | "ok";
};

function motivoDeAtencao(
  agentes: AgenteRecord[],
  execs: ExecutionRecord[],
): MotivoAtencao {
  const sr = successRate(execs);
  const errCount =
    (errorsByCode(execs)?.UNKNOWN ?? 0) +
    (errorsByCode(execs)?.PERMISSION ?? 0);
  const emImp = agentes.filter(
    (a) => a.status === "em_implantacao",
  );
  const diasEmImp = emImp
    .map((a) => daysToPublish(a))
    .filter((n): n is number => n !== null);
  const maxDiasImp = diasEmImp.length ? Math.max(...diasEmImp) : 0;

  if (errCount >= 3)
    return {
      texto: `${errCount} erros graves (UNKNOWN ou permissão) no período`,
      nivel: "alto",
    };
  if (sr !== null && sr < 0.7)
    return {
      texto: `Taxa de sucesso em ${formatPercent(sr)}`,
      nivel: "alto",
    };
  if (maxDiasImp > BASELINE_DIAS_ATE_NO_AR)
    return {
      texto: `${maxDiasImp} dias em implantação (acima do baseline)`,
      nivel: "medio",
    };
  if (sr !== null && sr < 0.85)
    return {
      texto: `Taxa de sucesso em ${formatPercent(sr)}`,
      nivel: "medio",
    };
  return { texto: "Sem alertas", nivel: "ok" };
}

function TabelaClientes({
  clientes,
  agentes,
  execucoes,
  periodo,
  clienteFiltro,
}: {
  clientes: ClienteRecord[];
  agentes: AgenteRecord[];
  execucoes: ExecutionRecord[];
  periodo: Periodo;
  clienteFiltro: string;
}) {
  const linhas = useMemo(() => {
    const visiveis =
      clienteFiltro === "todos"
        ? clientes
        : clientes.filter((c) => c.id === clienteFiltro);

    const base = visiveis.map((c) => {
      const agsCli = agentes.filter((a) => a.clienteId === c.id);
      const noAr = agsCli.filter((a) => a.status === "no_ar").length;
      const emImp = agsCli.filter((a) => a.status === "em_implantacao").length;
      const execsCli = execucoes.filter((e) => e.clienteId === c.id);
      const sr = successRate(execsCli);
      const errMax = mostFrequentError(execsCli);
      const diasImp = agsCli
        .filter((a) => a.status === "em_implantacao")
        .map((a) => daysToPublish(a))
        .filter((n): n is number => n !== null);
      const maxDiasImp = diasImp.length ? Math.max(...diasImp) : null;
      const motivo = motivoDeAtencao(agsCli, execsCli);
      return {
        cliente: c,
        noAr,
        emImp,
        sr,
        errMax,
        maxDiasImp,
        motivo,
      };
    });

    const prioridade = { alto: 0, medio: 1, ok: 2 } as const;
    return [...base].sort(
      (a, b) => prioridade[a.motivo.nivel] - prioridade[b.motivo.nivel],
    );
  }, [clientes, agentes, execucoes, clienteFiltro]);

  if (linhas.length === 0) return <EmptyState title="Clientes" />;

  return (
    <section
      aria-label="Clientes"
      className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Clientes</h2>
        <p className="text-xs text-zinc-500">
          Ordenados por necessidade de atenção. Período: últimos {periodo} dias.
          Decisão: qual cliente conversar primeiro.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 pr-4 text-left font-medium">Cliente</th>
              <th className="py-3 pr-4 text-right font-medium">No ar</th>
              <th className="py-3 pr-4 text-right font-medium">Em impl.</th>
              <th className="py-3 pr-4 text-right font-medium">
                Taxa de sucesso
              </th>
              <th className="py-3 pr-4 text-left font-medium">Erro + comum</th>
              <th className="py-3 pr-4 text-right font-medium">Dias em impl.</th>
              <th className="py-3 text-left font-medium">Atenção</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.cliente.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="py-3 pr-4">{l.cliente.nome}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{l.noAr}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{l.emImp}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {formatPercent(l.sr)}
                </td>
                <td className="py-3 pr-4">{l.errMax ?? "—"}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {l.maxDiasImp !== null ? `${l.maxDiasImp}` : "—"}
                </td>
                <td className="py-3">
                  <AtencaoBadge motivo={l.motivo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AtencaoBadge({ motivo }: { motivo: MotivoAtencao }) {
  const styles =
    motivo.nivel === "alto"
      ? "text-red-800 dark:text-red-200"
      : motivo.nivel === "medio"
        ? "text-amber-800 dark:text-amber-200"
        : "text-zinc-600 dark:text-zinc-400";
  const icon =
    motivo.nivel === "alto" ? "✕" : motivo.nivel === "medio" ? "⚠" : "✓";
  return (
    <span className={`inline-flex items-center gap-2 ${styles}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{motivo.texto}</span>
    </span>
  );
}

/* ─────────────────── Erros por tipo ─────────────────── */
function ErrosPorTipo({ execucoes }: { execucoes: ExecutionRecord[] }) {
  const dist = errorsByCode(execucoes);
  if (!dist) return <EmptyState title="Erros por tipo" />;

  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  const max = Math.max(...Object.values(dist));
  const entries = (Object.entries(dist) as [ErrorCode, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <section
      aria-label="Erros por tipo"
      className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Erros por tipo</h2>
        <p className="text-xs text-zinc-500">
          Total no período: {formatNumberPtBr(total)}. Decisão: para onde
          mandar o problema.
        </p>
      </header>
      <ul className="flex flex-col gap-4">
        {entries.map(([code, count]) => {
          const widthPct = (count / max) * 100;
          return (
            <li key={code} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">{code}</span>
                <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatNumberPtBr(count)} ({formatPercent(count / total)})
                </span>
              </div>
              <div
                className="h-2 rounded bg-zinc-100 dark:bg-zinc-800"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded bg-red-500"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                → {errorActionText(code)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─────────────────── Desempenho por agente (P2) ─────────────────── */
function DesempenhoPorAgente({
  agentes,
  execucoes,
  clienteFiltro,
}: {
  agentes: AgenteRecord[];
  execucoes: ExecutionRecord[];
  clienteFiltro: string;
}) {
  const agsVis = agentes.filter(
    (a) =>
      a.status === "no_ar" &&
      (clienteFiltro === "todos" || a.clienteId === clienteFiltro),
  );

  const linhas = agsVis.map((a) => {
    const execs = execucoes.filter((e) => e.agenteId === a.id);
    const latencies = execs.map((e) => e.latencyMs);
    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const sr = successRate(execs);
    const totalCost = execs.reduce((sum, e) => sum + estimateCostUsd(e.usage), 0);
    const perExec = execs.length ? totalCost / execs.length : null;
    return { agente: a, p50, p95, sr, totalCost, perExec, count: execs.length };
  });

  if (linhas.every((l) => l.count === 0))
    return <EmptyState title="Desempenho por agente" />;

  return (
    <section
      aria-label="Desempenho por agente"
      className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Desempenho por agente</h2>
        <p className="text-xs text-zinc-500">
          Limite [PROPOSTO]: p95 acima de {formatDuration(P95_LIMITE_MS)} precisa
          de atenção. Custo marcado como <strong>EXEMPLO</strong>, não oficial.
          Decisão: priorizar otimização ou ajuste.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 pr-4 text-left font-medium">Agente</th>
              <th className="py-3 pr-4 text-right font-medium">Execuções</th>
              <th className="py-3 pr-4 text-right font-medium">Latência p50</th>
              <th className="py-3 pr-4 text-right font-medium">Latência p95</th>
              <th className="py-3 pr-4 text-right font-medium">Sucesso</th>
              <th className="py-3 pr-4 text-right font-medium">Custo / exec</th>
              <th className="py-3 text-right font-medium">Custo total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const p95Alto = l.p95 !== null && l.p95 > P95_LIMITE_MS;
              return (
                <tr
                  key={l.agente.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="py-3 pr-4">{l.agente.nome}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatNumberPtBr(l.count)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatDuration(l.p50)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    <span
                      className={
                        p95Alto ? "text-red-700 dark:text-red-300" : ""
                      }
                    >
                      {formatDuration(l.p95)}
                      {p95Alto && (
                        <span className="ml-2 text-xs">(acima do limite)</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatPercent(l.sr)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCostUsd(l.perExec)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCostUsd(l.totalCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─────────────────── Confirmações (M6) ─────────────────── */
function ConfirmacoesBloco({
  execucoes,
}: {
  execucoes: ExecutionRecord[];
}) {
  const confirm = confirmRatio(execucoes);
  const dataRatio = dataChangedRatio(execucoes);

  if (!confirm) return <EmptyState title="Confirmações" />;

  const total = confirm.accepted + confirm.rejected;
  const acceptedPct = confirm.accepted / total;

  return (
    <section
      aria-label="Confirmações"
      className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Confirmações</h2>
        <p className="text-xs text-zinc-500">
          Decisão: se quase 100% são aceitas, há fricção sem ganho — avaliar
          remover a confirmação para esse fluxo.
        </p>
      </header>
      <dl className="grid grid-cols-3 gap-6 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Aceitas</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {formatNumberPtBr(confirm.accepted)}
          </dd>
          <p className="text-xs text-zinc-500">
            {formatPercent(acceptedPct)} do total
          </p>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Canceladas</dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {formatNumberPtBr(confirm.rejected)}
          </dd>
          <p className="text-xs text-zinc-500">
            {formatPercent(1 - acceptedPct)} do total
          </p>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">
            Execuções que alteraram dados
          </dt>
          <dd className="text-2xl font-semibold tabular-nums">
            {formatPercent(dataRatio)}
          </dd>
          <p className="text-xs text-zinc-500">no período</p>
        </div>
      </dl>
    </section>
  );
}

/* ─────────────────── Execuções recentes (P2) ─────────────────── */
function ExecucoesRecentes({
  agentes,
  clientes,
  execucoes,
  selectedRunId,
  onSelect,
  onClose,
  detail,
}: {
  agentes: AgenteRecord[];
  clientes: ClienteRecord[];
  execucoes: ExecutionRecord[];
  selectedRunId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  detail: RunResult | null;
}) {
  const ultimas = execucoes.slice(0, 20);
  const agMap = useMemo(() => new Map(agentes.map((a) => [a.id, a])), [agentes]);
  const cliMap = useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes],
  );
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!selectedRunId) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        rowRefs.current[selectedRunId!]?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedRunId, onClose]);

  if (ultimas.length === 0) return <EmptyState title="Execuções recentes" />;

  return (
    <section
      aria-label="Execuções recentes"
      className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Execuções recentes</h2>
        <p className="text-xs text-zinc-500">
          Últimas 20. Clique numa linha para ver o rastro completo.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 pr-4 text-left font-medium">Quando</th>
              <th className="py-3 pr-4 text-left font-medium">Agente</th>
              <th className="py-3 pr-4 text-left font-medium">Cliente</th>
              <th className="py-3 pr-4 text-left font-medium">Status</th>
              <th className="py-3 text-right font-medium">Latência</th>
            </tr>
          </thead>
          <tbody>
            {ultimas.map((e) => {
              const d = new Date(e.startedAt);
              const quando = d.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              });
              const ag = agMap.get(e.agenteId);
              const cli = cliMap.get(e.clienteId);
              const isSelected = selectedRunId === e.id;
              return (
                <tr
                  key={e.id}
                  className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${
                    isSelected ? "bg-zinc-50 dark:bg-zinc-900" : ""
                  }`}
                >
                  <td className="py-3 pr-4">
                    <button
                      ref={(el) => {
                        rowRefs.current[e.id] = el;
                      }}
                      type="button"
                      onClick={() =>
                        isSelected ? onClose() : onSelect(e.id)
                      }
                      aria-expanded={isSelected}
                      className="text-left text-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                    >
                      {quando}
                    </button>
                  </td>
                  <td className="py-3 pr-4">{ag?.nome ?? e.agenteId}</td>
                  <td className="py-3 pr-4">{cli?.nome ?? e.clienteId}</td>
                  <td className="py-3 pr-4">
                    <StatusInline
                      status={e.status}
                      errorCode={e.errorCode}
                    />
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatDuration(e.latencyMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRunId && detail && (
        <DetalhePainel
          run={detail}
          onClose={() => {
            onClose();
            rowRefs.current[selectedRunId]?.focus();
          }}
        />
      )}
    </section>
  );
}

function StatusInline({
  status,
  errorCode,
}: {
  status: ExecutionRecord["status"];
  errorCode?: ErrorCode;
}) {
  const map = {
    success: { icon: "✓", label: "Sucesso", color: "text-emerald-700 dark:text-emerald-300" },
    error: { icon: "✕", label: errorCode ?? "Erro", color: "text-red-700 dark:text-red-300" },
    needs_input: { icon: "?", label: "Pediu dado", color: "text-sky-700 dark:text-sky-300" },
    awaiting_confirmation: {
      icon: "⚠",
      label: "Aguardava confirmação",
      color: "text-amber-800 dark:text-amber-200",
    },
  } as const;
  const info = map[status];
  return (
    <span className={`inline-flex items-center gap-2 ${info.color}`}>
      <span aria-hidden="true">{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}

function DetalhePainel({
  run,
  onClose,
}: {
  run: RunResult;
  onClose: () => void;
}) {
  const [techOpen, setTechOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    regionRef.current?.focus();
  }, []);

  const dataLabel = run.dataChanged
    ? "Dados alterados"
    : "Nenhum dado foi alterado";

  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      role="region"
      aria-label="Detalhe da execução"
      className="flex flex-col gap-4 rounded border border-zinc-200 bg-zinc-50 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            Execução {run.runId}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            <span aria-hidden="true">{run.dataChanged ? "● " : "○ "}</span>
            {dataLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-300 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700"
          aria-label="Fechar detalhe"
        >
          Fechar (Esc)
        </button>
      </header>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          O que o agente fez
        </h4>
        <ol className="flex flex-col gap-2">
          {run.steps.map((s) => {
            const { title, detail } = humanizeStep(s);
            return (
              <li
                key={s.index}
                className="rounded border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="font-medium">
                  {s.index}. {title}
                </p>
                {detail && (
                  <p className="mt-2 text-zinc-700 dark:text-zinc-300">
                    {detail}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <button
        type="button"
        onClick={() => setTechOpen((o) => !o)}
        aria-expanded={techOpen}
        className="self-start rounded border border-zinc-300 px-4 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700"
      >
        {techOpen ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}
      </button>
      {techOpen && (
        <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-950">
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-zinc-500">Latência</dt>
              <dd>{formatDuration(run.latencyMs)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tokens entrada</dt>
              <dd>{formatNumberPtBr(run.usage.inputTokens)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tokens saída</dt>
              <dd>{formatNumberPtBr(run.usage.outputTokens)}</dd>
            </div>
          </dl>
          <pre className="overflow-x-auto rounded bg-zinc-100 p-4 font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {JSON.stringify(run, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── (helpers evitando "unused" sem uso) ─────────────────── */
// Mantém formatRelativeDays referenciado para quando o CS clicar em "ver mais".
// (não exportado para fora da pasta; serve de hook para evolução).
export const __PAINEL_UTIL = { formatRelativeDays };
