"use client";

import { useState } from "react";

type TraceStep = {
  step: number;
  toolCalls: Array<{ toolName: string; input: unknown }>;
  toolResults: Array<{ toolName: string; output: unknown }>;
  text: string;
};

type AgentResponse = {
  text: string;
  trace: TraceStep[];
  stepsCount: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
  latencyMs: number;
};

export default function AgentPage() {
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AgentResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-passcode": passcode,
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? `Erro ${res.status}`);
        return;
      }

      setResponse(data as AgentResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12 text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Agente — Agent Backoffice Lab</h1>
        <p className="text-sm text-zinc-400">
          Agente com 2 ferramentas (cadastrar e listar clientes) gravando no Supabase.
          O rastro mostra cada passo que o modelo deu.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Passcode</span>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="sua frase secreta"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Mensagem</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={1}
            maxLength={2000}
            rows={4}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            placeholder='Ex.: "Cadastre o Hospital Teste Alfa, CNPJ 11222333000181"'
          />
          <span className="text-xs text-zinc-500">{message.length} / 2000</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {loading ? "Executando..." : "Enviar"}
        </button>
      </form>

      {error && (
        <div className="rounded border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {response && (
        <>
          <section className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-4 py-4">
            <h2 className="text-sm font-semibold text-zinc-300">
              Resposta final
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-100">
              {response.text || "(sem texto final — veja o rastro)"}
            </p>
            <dl className="grid grid-cols-4 gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
              <div>
                <dt className="text-zinc-500">Passos</dt>
                <dd>{response.stepsCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Latência</dt>
                <dd>{response.latencyMs} ms</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Tokens entrada</dt>
                <dd>{response.usage.inputTokens ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Tokens saída</dt>
                <dd>{response.usage.outputTokens ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">
              Rastro do agente
            </h2>
            {response.trace.length === 0 && (
              <p className="text-sm text-zinc-500">(sem passos)</p>
            )}
            {response.trace.map((step) => (
              <div
                key={step.step}
                className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-xs"
              >
                <div className="text-zinc-500">Passo {step.step}</div>

                {step.toolCalls.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-amber-300">
                      Tool calls
                    </div>
                    {step.toolCalls.map((call, i) => (
                      <div key={i} className="flex flex-col gap-1 pl-2">
                        <div className="text-zinc-300">→ {call.toolName}</div>
                        <pre className="overflow-x-auto rounded bg-black/40 p-2 text-zinc-400">
                          {JSON.stringify(call.input, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {step.toolResults.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="font-semibold text-emerald-300">
                      Tool results
                    </div>
                    {step.toolResults.map((r, i) => (
                      <div key={i} className="flex flex-col gap-1 pl-2">
                        <div className="text-zinc-300">← {r.toolName}</div>
                        <pre className="overflow-x-auto rounded bg-black/40 p-2 text-zinc-400">
                          {JSON.stringify(r.output, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {step.text && (
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-sky-300">
                      Texto do modelo
                    </div>
                    <p className="whitespace-pre-wrap pl-2 text-zinc-300">
                      {step.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
