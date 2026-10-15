"use client";

import { useMemo, useState } from "react";

import type { AgentConfig } from "@/lib/contract";

type Submitted = { config: AgentConfig; summary: string };

export default function NovoAgentePage() {
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [cadastrar, setCadastrar] = useState(false);
  const [listar, setListar] = useState(true);
  const [confirmar, setConfirmar] = useState(true);
  const [cienciaSemConfirmacao, setCienciaSemConfirmacao] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  const nomeInvalid = nome.length > 0 && (nome.length < 2 || nome.length > 60);
  const objetivoInvalid =
    objetivo.length > 0 && (objetivo.length < 10 || objetivo.length > 300);
  const semAcao = !cadastrar && !listar;

  const configRascunho: AgentConfig = useMemo(
    () => ({
      nome,
      objetivo,
      acoesPermitidas: { cadastrarCliente: cadastrar, listarClientes: listar },
      pedirConfirmacaoAlteraDados: confirmar,
    }),
    [nome, objetivo, cadastrar, listar, confirmar],
  );

  const avisoConfirmacaoDesligada = cadastrar && !confirmar;
  const bloqueado =
    nome.length < 2 ||
    nome.length > 60 ||
    objetivo.length < 10 ||
    objetivo.length > 300 ||
    semAcao ||
    (avisoConfirmacaoDesligada && !cienciaSemConfirmacao);

  const previewLines = useMemo(
    () => generatePreview(configRascunho),
    [configRascunho],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (bloqueado) return;
    setSubmitted({
      config: configRascunho,
      summary: previewLines.join(" "),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-8 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Novo agente</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Rascunho. Nada é salvo nem publicado — isso é um ambiente de teste.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="nome" className="text-sm font-medium">
            Nome do agente
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={60}
            aria-invalid={nomeInvalid}
            aria-describedby="nome-help"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p
            id="nome-help"
            className={`text-xs ${nomeInvalid ? "text-red-700 dark:text-red-300" : "text-zinc-500"}`}
          >
            {nomeInvalid ? (
              <>
                <span aria-hidden="true">✕ </span>
                Entre 2 e 60 caracteres.
              </>
            ) : (
              <>
                {nome.length}/60. Ex.: &quot;Agente de cadastro Alfa&quot;.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="objetivo" className="text-sm font-medium">
            Objetivo em uma frase
          </label>
          <textarea
            id="objetivo"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            maxLength={300}
            rows={3}
            aria-invalid={objetivoInvalid}
            aria-describedby="objetivo-help"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p
            id="objetivo-help"
            className={`text-xs ${objetivoInvalid ? "text-red-700 dark:text-red-300" : "text-zinc-500"}`}
          >
            {objetivoInvalid ? (
              <>
                <span aria-hidden="true">✕ </span>
                Entre 10 e 300 caracteres.
              </>
            ) : (
              <>{objetivo.length}/300.</>
            )}
          </p>
        </div>

        <fieldset className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <legend className="px-2 text-sm font-medium">
            Ações permitidas
          </legend>
          <AcaoCheckbox
            id="cadastrar"
            checked={cadastrar}
            onChange={setCadastrar}
            label="Cadastrar cliente"
            descricao="Grava um novo hospital no sistema."
            alteraDados
          />
          <AcaoCheckbox
            id="listar"
            checked={listar}
            onChange={setListar}
            label="Listar clientes"
            descricao="Consulta a lista de hospitais já cadastrados."
            alteraDados={false}
          />
          {semAcao && (
            <p className="text-xs text-red-700 dark:text-red-300">
              <span aria-hidden="true">✕ </span>
              Marque ao menos uma ação.
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <label className="flex items-start gap-4 text-sm">
            <input
              type="checkbox"
              checked={confirmar}
              onChange={(e) => {
                setConfirmar(e.target.checked);
                if (e.target.checked) setCienciaSemConfirmacao(false);
              }}
              className="mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            />
            <span>
              <strong>Pedir minha confirmação</strong> antes de qualquer ação
              que altera dados.
              <br />
              <span className="text-xs text-zinc-500">
                Padrão: ligado. Desligar aumenta a velocidade do agente mas
                também o risco de ações indesejadas.
              </span>
            </span>
          </label>
          {avisoConfirmacaoDesligada && (
            <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p>
                <span aria-hidden="true">⚠ </span>
                <strong>Atenção:</strong> você desligou a confirmação com
                &quot;Cadastrar cliente&quot; marcada. O agente vai gravar no
                sistema sem perguntar.
              </p>
              <label className="flex items-start gap-4 text-sm">
                <input
                  type="checkbox"
                  checked={cienciaSemConfirmacao}
                  onChange={(e) =>
                    setCienciaSemConfirmacao(e.target.checked)
                  }
                  className="mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                />
                <span>
                  Entendi o risco e assumo responsabilidade por essa escolha.
                </span>
              </label>
            </div>
          )}
        </div>

        <section
          aria-label="Prévia do comportamento do agente"
          className="flex flex-col gap-2 rounded border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
        >
          <h2 className="text-sm font-semibold">
            Como o agente vai se comportar
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-6">
            {previewLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <button
          type="submit"
          disabled={bloqueado}
          className="rounded bg-zinc-900 px-6 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Salvar rascunho
        </button>
      </form>

      {submitted && <RascunhoSalvo submitted={submitted} />}
    </main>
  );
}

function AcaoCheckbox({
  id,
  checked,
  onChange,
  label,
  descricao,
  alteraDados,
}: {
  id: string;
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  descricao: string;
  alteraDados: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-4 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      />
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-4">
          <strong>{label}</strong>
          <span
            className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs ${
              alteraDados
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <span aria-hidden="true">{alteraDados ? "⚠" : "●"}</span>
            {alteraDados ? "Altera dados" : "Somente leitura"}
          </span>
        </span>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {descricao}
        </span>
      </span>
    </label>
  );
}

/**
 * Gera a prévia determinística do comportamento com base no AgentConfig.
 * NÃO usa LLM — regra pura, previsível, auditável.
 */
function generatePreview(config: AgentConfig): string[] {
  const linhas: string[] = [];
  const nome = config.nome.trim() || "Este agente";
  const nomeExibido = config.nome.trim() ? `"${nome}"` : nome;

  if (config.objetivo.trim().length >= 10) {
    linhas.push(`Objetivo declarado: ${config.objetivo.trim()}`);
  } else {
    linhas.push("Objetivo ainda não definido.");
  }

  const acoes: string[] = [];
  if (config.acoesPermitidas.cadastrarCliente)
    acoes.push("cadastrar novos clientes");
  if (config.acoesPermitidas.listarClientes)
    acoes.push("listar clientes já cadastrados");

  if (acoes.length === 0) {
    linhas.push(`${nomeExibido} ainda não tem nenhuma ação permitida.`);
    return linhas;
  }

  linhas.push(`${nomeExibido} vai poder: ${acoes.join(" e ")}.`);

  if (config.acoesPermitidas.cadastrarCliente) {
    if (config.pedirConfirmacaoAlteraDados) {
      linhas.push(
        "Antes de cadastrar, vai pedir sua confirmação (padrão seguro).",
      );
    } else {
      linhas.push(
        "Vai cadastrar diretamente, sem pedir confirmação — mais rápido, mais risco.",
      );
    }
  }

  return linhas;
}

function RascunhoSalvo({ submitted }: { submitted: Submitted }) {
  const [tech, setTech] = useState(false);
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4 rounded border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
    >
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="text-lg">
          ✓
        </span>
        <h2 className="text-sm font-semibold">
          Rascunho salvo — nada foi salvo ou publicado
        </h2>
      </div>
      <p>{submitted.summary}</p>
      <button
        type="button"
        onClick={() => setTech((t) => !t)}
        aria-expanded={tech}
        className="self-start rounded border border-emerald-700 px-4 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-emerald-300"
      >
        {tech ? "Ocultar detalhes técnicos" : "Mostrar detalhes técnicos"}
      </button>
      {tech && (
        <pre className="overflow-x-auto rounded bg-emerald-900/10 p-4 font-mono text-xs text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
          {JSON.stringify(submitted.config, null, 2)}
        </pre>
      )}
    </section>
  );
}
