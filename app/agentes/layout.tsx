import Link from "next/link";

const DATA_SNAPSHOT = "15/10/2026";

export default function AgentesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div
        role="status"
        aria-live="polite"
        className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <span aria-hidden="true">⚠ </span>
        Dados simulados até {DATA_SNAPSHOT}. Nenhum número aqui vem de produção.
      </div>

      <nav
        aria-label="Navegação do back-office de agentes"
        className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <ul className="mx-auto flex max-w-5xl flex-wrap gap-6 text-sm">
          <li>
            <Link
              href="/agentes/painel"
              className="rounded px-2 py-1 font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Painel
            </Link>
          </li>
          <li>
            <Link
              href="/agentes/testar"
              className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Testar agente
            </Link>
          </li>
          <li>
            <Link
              href="/agentes/novo"
              className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Novo agente
            </Link>
          </li>
        </ul>
      </nav>

      <div className="flex-1">{children}</div>
    </div>
  );
}
