"use client";

import { useState } from "react";

type ChatResponse = {
  text: string;
  usage: { inputTokens: number | null; outputTokens: number | null };
  latencyMs: number;
};

export default function ChatPage() {
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
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

      setResponse(data as ChatResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Chat — Agent Backoffice Lab</h1>
        <p className="text-sm text-zinc-400">
          Primeira chamada de LLM via route handler no servidor. O passcode
          protege o endpoint; a chave da Anthropic nunca sai do servidor.
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
            rows={5}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="Pergunte algo..."
          />
          <span className="text-xs text-zinc-500">
            {message.length} / 2000
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>

      {error && (
        <div className="rounded border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {response && (
        <section className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-4 py-4">
          <h2 className="text-sm font-semibold text-zinc-300">Resposta</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-100">
            {response.text}
          </p>
          <dl className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
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
      )}
    </main>
  );
}
