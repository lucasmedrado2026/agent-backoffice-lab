"use client";

import { useEffect, useRef, useState } from "react";

import { AgentApi, type Scenario } from "@/lib/api";
import type { ErrorCode, RunResult, ToolResult } from "@/lib/contract";
import { humanizeStep } from "@/lib/trace-humanizer";

type ViewState =
  | { kind: "idle" }
  | { kind: "loading"; startedAt: number }
  | { kind: "result"; run: RunResult };

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "sucesso", label: "Sucesso — cadastro realizado" },
  { value: "cnpj_duplicado", label: "Erro — CNPJ já cadastrado" },
  { value: "sem_permissao", label: "Erro — agente sem permissão" },
  { value: "indisponivel", label: "Erro — sistema indisponível (retryable)" },
  { value: "erro_desconhecido", label: "Erro — causa desconhecida" },
  { value: "pede_dado", label: "Agente pede o CNPJ" },
  { value: "lento", label: "Lento (~4,5s)" },
  { value: "confirmacao", label: "Pede confirmação antes de cadastrar" },
];

export default function TestarAgentePage() {
  const [scenario, setScenario] = useState<Scenario>("sucesso");
  const [message, setMessage] = useState(
    "Cadastre o Hospital Teste Alfa, CNPJ 11222333000181",
  );
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const [confirmBusy, setConfirmBusy] = useState<"accept" | "reject" | null>(
    null,
  );
  const [idCopied, setIdCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startedAt = Date.now();
    setView({ kind: "loading", startedAt });
    setIdCopied(false);
    const run = await AgentApi.runAgent(message, scenario);
    setView({ kind: "result", run });
  }

  async function handleConfirm(accept: boolean) {
    if (view.kind !== "result" || !view.run.pendingAction) return;
    setConfirmBusy(accept ? "accept" : "reject");
    const run = await AgentApi.confirmAction(view.run.runId, accept);
    setConfirmBusy(null);
    setView({ kind: "result", run });
  }

  async function handleCopyRunId(runId: string) {
    try {
      await navigator.clipboard.writeText(runId);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    } catch {
      setIdCopied(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-12 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Testar agente</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Simule uma execução do agente, veja o que ele fez e se algum dado foi
          alterado — sem precisar do time técnico.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset
          className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
          aria-label="Modo de simulação"
        >
          <legend className="px-2 text-xs font-medium text-amber-900 dark:text-amber-200">
            <span aria-hidden="true">⚠ </span>Simulação (apenas desenvolvimento)
          </legend>
          <label htmlFor="scenario" className="sr-only">
            Cenário de simulação
          </label>
          <select
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
            disabled={view.kind === "loading"}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {SCENARIOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="message" className="text-sm font-medium">
            Mensagem para o agente
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            disabled={view.kind === "loading"}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={view.kind === "loading"}
          className="rounded bg-zinc-900 px-6 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {view.kind === "loading" ? "Executando…" : "Testar agente"}
        </button>
      </form>

      {view.kind === "idle" && <IdleHint />}

      {view.kind === "loading" && <LoadingBlock startedAt={view.startedAt} />}

      {view.kind === "result" && (
        <ResultBlock
          run={view.run}
          confirmBusy={confirmBusy}
          idCopied={idCopied}
          onConfirm={handleConfirm}
          onCopyRunId={handleCopyRunId}
          onRetry={() => {
            // reenvia a mesma simulação com a mesma mensagem
            setView({ kind: "loading", startedAt: Date.now() });
            AgentApi.runAgent(message, scenario).then((run) =>
              setView({ kind: "result", run }),
            );
          }}
          onReplyNeedsInput={(reply) => {
            setView({ kind: "loading", startedAt: Date.now() });
            // Numa integração real reusaríamos o runId; no mock, basta re-executar.
            AgentApi.runAgent(reply, "sucesso").then((run) =>
              setView({ kind: "result", run }),
            );
          }}
        />
      )}
    </main>
  );
}

function IdleHint() {
  return (
    <section className="rounded border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
      Escolha uma simulação acima e clique em <strong>Testar agente</strong>.
      Nenhuma informação sai desta tela — isso é um ambiente de teste.
    </section>
  );
}

function LoadingBlock({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt]);

  const seconds = (elapsed / 1000).toFixed(1);
  const stage =
    elapsed < 800
      ? "Enviando sua mensagem…"
      : elapsed < 2500
        ? "Agente escolhendo o que fazer…"
        : "Executando as ações…";

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex items-center justify-between gap-4 rounded border border-zinc-200 bg-zinc-50 p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-500"
        />
        <span>{stage}</span>
      </div>
      <span className="text-xs text-zinc-500" aria-label={`${seconds} segundos`}>
        {seconds}s
      </span>
    </section>
  );
}

type ResultBlockProps = {
  run: RunResult;
  confirmBusy: "accept" | "reject" | null;
  idCopied: boolean;
  onConfirm: (accept: boolean) => void;
  onCopyRunId: (runId: string) => void;
  onRetry: () => void;
  onReplyNeedsInput: (reply: string) => void;
};

function ResultBlock({
  run,
  confirmBusy,
  idCopied,
  onConfirm,
  onCopyRunId,
  onRetry,
  onReplyNeedsInput,
}: ResultBlockProps) {
  return (
    <div className="flex flex-col gap-6">
      <StatusBanner run={run} />

      {run.status === "awaiting_confirmation" && run.pendingAction && (
        <ConfirmationCard
          summary={run.pendingAction.summary}
          busy={confirmBusy}
          onAccept={() => onConfirm(true)}
          onReject={() => onConfirm(false)}
        />
      )}

      {run.status === "needs_input" && (
        <NeedsInputCard question={run.finalText} onReply={onReplyNeedsInput} />
      )}

      {run.status === "error" && (
        <ErrorBlock
          run={run}
          idCopied={idCopied}
          onCopyRunId={() => onCopyRunId(run.runId)}
          onRetry={onRetry}
        />
      )}

      <AgentDidSection run={run} />
      <TechDetailsSection run={run} />
    </div>
  );
}

function StatusBanner({ run }: { run: RunResult }) {
  const { tone, icon, title } = statusVisual(run.status);
  const dataLabel = run.dataChanged
    ? "Dados alterados"
    : "Nenhum dado foi alterado";

  return (
    <section
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-2 rounded border p-6 ${tone}`}
    >
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="text-lg font-semibold">
          {icon}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="text-sm">{run.finalText}</p>
      <p className="text-xs font-medium">
        <span aria-hidden="true">{run.dataChanged ? "● " : "○ "}</span>
        {dataLabel}
      </p>
    </section>
  );
}

function statusVisual(status: RunResult["status"]) {
  switch (status) {
    case "success":
      return {
        tone: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
        icon: "✓",
        title: "Sucesso",
      };
    case "error":
      return {
        tone: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100",
        icon: "✕",
        title: "Erro",
      };
    case "awaiting_confirmation":
      return {
        tone: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
        icon: "⚠",
        title: "Aguardando sua confirmação",
      };
    case "needs_input":
      return {
        tone: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100",
        icon: "?",
        title: "O agente precisa de uma resposta",
      };
  }
}

function ConfirmationCard({
  summary,
  busy,
  onAccept,
  onReject,
}: {
  summary: string;
  busy: "accept" | "reject" | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">O que o agente quer fazer</h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{summary}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={onAccept}
          disabled={busy !== null}
          className="rounded bg-zinc-900 px-6 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy === "accept" ? "Confirmando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy !== null}
          className="rounded border border-zinc-300 bg-transparent px-6 py-2 text-sm font-medium text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100"
        >
          {busy === "reject" ? "Cancelando…" : "Cancelar"}
        </button>
      </div>
    </section>
  );
}

function NeedsInputCard({
  question,
  onReply,
}: {
  question: string;
  onReply: (reply: string) => void;
}) {
  const [reply, setReply] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reply.trim()) return;
    onReply(reply.trim());
  }

  return (
    <section className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Resposta do agente</h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{question}</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="reply" className="sr-only">
          Sua resposta
        </label>
        <input
          id="reply"
          ref={inputRef}
          type="text"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Digite sua resposta"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={!reply.trim()}
          className="self-start rounded bg-zinc-900 px-6 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Enviar resposta
        </button>
      </form>
    </section>
  );
}

function ErrorBlock({
  run,
  idCopied,
  onCopyRunId,
  onRetry,
}: {
  run: RunResult;
  idCopied: boolean;
  onCopyRunId: () => void;
  onRetry: () => void;
}) {
  // Encontra o primeiro result de erro para extrair retryable e code.
  const errorResult = run.steps
    .map((s) => s.result)
    .find((r): r is Extract<ToolResult<unknown>, { ok: false }> =>
      Boolean(r && r.ok === false),
    );
  const retryable = errorResult?.retryable ?? false;
  const suggestedAction = suggestedActionFromCode(errorResult?.code);

  return (
    <section className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">O que fazer agora</h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {suggestedAction}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {retryable && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded bg-zinc-900 px-6 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Tentar de novo
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>ID da execução:</span>
          <code className="rounded bg-zinc-100 px-2 py-1 font-mono dark:bg-zinc-800">
            {run.runId}
          </code>
          <button
            type="button"
            onClick={onCopyRunId}
            className="rounded border border-zinc-300 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700"
            aria-live="polite"
          >
            {idCopied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </section>
  );
}

function suggestedActionFromCode(code: ErrorCode | undefined): string {
  switch (code) {
    case "VALIDATION":
      return "Corrigir e reenviar.";
    case "DUPLICATE":
      return "Consultar o cadastro existente.";
    case "PERMISSION":
      return "Avisar o time técnico.";
    case "UNAVAILABLE":
      return "Tentar de novo em instantes.";
    case "UNKNOWN":
      return "Copiar o ID da execução e enviar ao time técnico.";
    default:
      return "Copiar o ID da execução e enviar ao time técnico.";
  }
}

function AgentDidSection({ run }: { run: RunResult }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">O que o agente fez</h2>
      <ol className="flex flex-col gap-2">
        {run.steps.map((step) => {
          const { title, detail } = humanizeStep(step);
          return (
            <li
              key={step.index}
              className="rounded border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {step.index}. {title}
              </p>
              {detail && (
                <p className="mt-2 text-zinc-700 dark:text-zinc-300">{detail}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TechDetailsSection({ run }: { run: RunResult }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="self-start rounded border border-zinc-300 px-4 py-2 text-xs text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300"
      >
        {open ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}
      </button>
      {open && (
        <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/40">
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-zinc-500">Latência</dt>
              <dd>{run.latencyMs} ms</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tokens entrada</dt>
              <dd>{run.usage.inputTokens}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tokens saída</dt>
              <dd>{run.usage.outputTokens}</dd>
            </div>
          </dl>
          <pre className="overflow-x-auto rounded bg-zinc-100 p-4 font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            {JSON.stringify(run, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
