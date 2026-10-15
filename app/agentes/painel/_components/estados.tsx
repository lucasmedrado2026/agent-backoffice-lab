/** Blocos reutilizáveis de estado: carregando, vazio, erro. */

type Props = { title: string };

export function LoadingState({ title }: Props) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex items-center gap-4 rounded border border-zinc-200 bg-zinc-50 p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-500"
      />
      <span>Carregando {title.toLowerCase()}…</span>
    </section>
  );
}

export function EmptyState({ title }: Props) {
  return (
    <section className="flex items-center gap-4 rounded border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
      <span aria-hidden="true">○</span>
      <span>Sem dados no período para {title.toLowerCase()}.</span>
    </section>
  );
}

export function ErrorBlock({
  title,
  onRetry,
}: {
  title: string;
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
      <div className="flex items-center gap-4">
        <span aria-hidden="true">✕</span>
        <span>Não foi possível carregar {title.toLowerCase()}.</span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded border border-red-700 bg-transparent px-4 py-2 text-xs font-medium text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-red-300 dark:text-red-100"
      >
        Tentar de novo
      </button>
    </section>
  );
}
