# DESIGN.md — Agent Backoffice Lab

**[validado por Lucas em 2026-10-14]**

Fonte de verdade para decisões de design. Prevalece sobre skills, referências e intuição.

---

## 1. Valores extraídos do código [extraído do código]

### Cores
- Base clara: `--background: #ffffff` · `--foreground: #171717` (globals.css)
- Base escura (prefers-color-scheme: dark): `--background: #0a0a0a` · `--foreground: #ededed`
- Paleta usada nas telas atuais (`/chat`, `/agent`): família **zinc** do Tailwind (`zinc-100`, `zinc-300`, `zinc-400`, `zinc-500`, `zinc-700`, `zinc-800`, `zinc-900`).

### Tipografia
- Família principal: **Geist Sans** (Google Fonts via `next/font/google`), variável `--font-geist-sans`.
- Monoespaçada: **Geist Mono** (`--font-geist-mono`) — reservada a blocos `pre/code` em "Detalhes técnicos".
- `body` em `globals.css` tem fallback `Arial, Helvetica, sans-serif`.

### Espaçamento
- Tailwind v4 default (base 4px: unit 1 = 4px, 2 = 8px, 4 = 16px…).
- Telas atuais usam mistura: `px-3`, `px-4`, `py-2`, `py-3`, `py-4`, `py-12`, `gap-2`, `gap-3`, `gap-4`, `gap-6`.

### Framework
- Next.js 16.4 + App Router · React 19.3 · Tailwind 4 · TypeScript 5.

---

## 2. Restrições-base [base]

> Escritas pelo Lucas. Não negociáveis.

**Quem usa**: time de CS, não técnico, testando agentes de hospital sob pressão de prazo. Erro mal explicado vira pedido de ajuda ao dev — é o custo a cortar.

### Regras
- **Cor de ação:** uma só cor para o botão principal; **nunca** decorativa; **um** botão principal por tela.
- **Estados** (sucesso, erro, atenção, neutro): cada cor com uma função, **sempre** com ícone **e** texto. **Nunca só cor**.
- **Espaçamento:** múltiplos de **8px**. Em Tailwind v4 (base 4px) → prefira unidades **pares**: `2`, `4`, `6`, `8`, `10`, `12`, `16`, `20`, `24` (= 8, 16, 24, 32, 40, 48, 64, 80, 96 px). Sem valores soltos.
- **Tipografia:** uma família (Geist), **no máximo 4 tamanhos** em uso em uma tela.
- **Texto em português**, sem jargão. Os termos `tool`, `token`, `JSON` **só** dentro da seção "Detalhes técnicos".
- **Hierarquia:** o **banner de status** é o elemento visualmente dominante da tela.
- **Tema:** seguir o existente (light + dark via `prefers-color-scheme`). Contraste de texto **mínimo 4.5:1**.

### Proibido
- Gradiente decorativo.
- Emoji como ícone (use `<svg>` ou caracteres unicode geométricos simples: `✓`, `✕`, `⚠`, `?`, `●`).
- JSON à vista fora de "Detalhes técnicos".
- Mais de um botão principal por tela.
- Mensagem de erro que **culpa o usuário**.

---

## 3. Convenções de implementação [base]

### Paleta de estados (mapeia para família zinc + funcional)

| Estado | Cor-base | Classes Tailwind sugeridas | Ícone |
|---|---|---|---|
| Sucesso | verde (emerald) | `text-emerald-700 dark:text-emerald-300`, `bg-emerald-50 dark:bg-emerald-950/40`, borda `border-emerald-200 dark:border-emerald-800` | `✓` |
| Erro | vermelho (red) | `text-red-700 dark:text-red-300`, `bg-red-50 dark:bg-red-950/40`, borda `border-red-200 dark:border-red-800` | `✕` |
| Atenção / confirmação | amarelo (amber) | `text-amber-800 dark:text-amber-200`, `bg-amber-50 dark:bg-amber-950/40`, borda `border-amber-200 dark:border-amber-800` | `⚠` |
| Pergunta (needs_input) | azul (sky) | `text-sky-800 dark:text-sky-200`, `bg-sky-50 dark:bg-sky-950/40`, borda `border-sky-200 dark:border-sky-800` | `?` |
| Neutro | zinc | `text-zinc-700 dark:text-zinc-300`, `bg-zinc-100 dark:bg-zinc-900`, borda `border-zinc-200 dark:border-zinc-800` | `●` |

### Botão principal (único por tela)
- `bg-zinc-900 text-zinc-50` (claro) / `bg-zinc-100 text-zinc-900` (escuro)
- `rounded`, `px-4 py-2`, `font-medium`, `text-sm`
- Foco visível: `focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`
- Estado disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

### Botões secundários
- Versão outlined: `border border-zinc-300 dark:border-zinc-700`, `bg-transparent`, mesmo tamanho de texto.

### Tipografia (tamanhos permitidos — no máximo 4 por tela)
- `text-xs` (12px) — meta-informação, labels de detalhes técnicos
- `text-sm` (14px) — texto corrente, campos, botões
- `text-base` (16px) — corpo em contexto denso (opcional)
- `text-lg` (18px) ou `text-2xl` (24px) — títulos (escolher 1 por tela)

### Grid de espaçamento (sanity check)
- Entre seções grandes: `gap-6` (24px) ou `gap-8` (32px)
- Entre elementos relacionados: `gap-2` (8px) ou `gap-3` (12px — 12 é múltiplo de 4; se precisar estrito de 8, use `gap-2` ou `gap-4`)
- Padding interno de cards: `p-4` (16px) ou `p-6` (24px)

---

## 4. Sugestões a confirmar [PROPOSTO]

Essas vão além do que o Lucas definiu. Precisam de "OK" explícito antes de valerem como regra.

1. **[PROPOSTO] Fontes do sistema em vez de Geist nas novas telas** — hoje o `globals.css` tem fallback `Arial/Helvetica` na `body`, que **sobrescreve** a Geist aplicada via variável no `<html>`. Isso cria risco de inconsistência tipográfica. Opção A: remover o `font-family` da `body` do globals.css. Opção B: aceitar fallback. Sugiro A, mas requer tocar em `globals.css` (que não está na lista de arquivos permitidos), então mantenho a Opção B por padrão.
2. **[PROPOSTO] Cores de estado como variáveis CSS no `@theme`** — hoje usamos classes Tailwind diretas (`emerald-700`). Centralizar em `--color-success-fg` etc. ajuda consistência. Fora do escopo do Dia 4 (requer editar `globals.css`).
3. **[PROPOSTO] Container padrão `max-w-2xl mx-auto px-6` para telas de CS** — mesma largura máxima da tela `/chat` atual, mantém legibilidade sem overflow.
4. **[PROPOSTO] Headings na escala apenas `text-2xl` (24px) e `text-sm font-medium` (14px bold)** — reduz pra 2 tamanhos de título + 2 de corpo = exatamente 4 tamanhos.

---

## 5. Alvo de acessibilidade [base]

- Todo `<input>`, `<textarea>`, `<select>` tem `<label>` associado (via `htmlFor` ou wrapping).
- Todo botão navegável por teclado com foco visível (via `focus-visible:ring-*`).
- Estados **nunca comunicados só por cor** — sempre também por texto e ícone (caractere unicode ou SVG inline).
- Contraste texto/fundo ≥ 4.5:1 em ambos os temas (validar o par vermelho/verde que escolhi acima).
- `role="status"` ou `aria-live="polite"` no banner de resultado para que screen readers anunciem mudanças.
- `aria-busy="true"` em áreas durante carregamento.

---

## 6. Dashboard [validado por Lucas em 2026-10-15]

Específico para telas tipo "painel" (`app/agentes/painel`, etc.).
Herda tudo da seção 2 (Restrições-base) e adiciona:

### Hierarquia
- Elemento dominante da tela: **1 métrica única em destaque** (ex.: M5 = "Dias até no ar"), tipograficamente maior que tudo (`text-4xl` ou `text-5xl` — adiciona 1 tamanho ao limite de 4, ok para dashboard).
- Nenhum outro número pode competir com ela. Métricas secundárias usam `text-2xl` ou menos.
- Máximo **3 números em destaque** por seção (nunca 6 cards KPI idênticos).

### Dados e formatação
- Números em `pt-BR` (vírgula decimal, ponto como separador de milhar). Ex.: `1.234` e `99,8%`.
- Datas no formato `dd/mm/aaaa` ou relativas ("há 3 dias").
- Toda métrica declara em letra miúda a **decisão que apoia** (ex.: debaixo de "Taxa de sucesso" → "quais agentes precisam ajuste").
- Toda métrica declara a **janela** ("últimos 7/14/30 dias") e a **data da última atualização**.
- "Sem dados no período" como texto explícito — **nunca** `0,0%` ou `NaN`.
- Baseline (ex.: "referência: 130 dias") sempre rotulado como "informado por X, a validar".

### Gráficos
- SVG inline + Tailwind (sem bibliotecas).
- **Todo gráfico tem valores em texto** ao lado ou numa tabela equivalente (acessibilidade).
- Proibido: gráfico 3D, pie chart decorativo, gradiente em barra, animação on-hover que esconde dado.
- Permitido: barra horizontal, sparkline, linha simples, mini bar chart.

### Tabela (quando houver)
- Números: `text-right`, `font-mono` ou `tabular-nums`.
- Texto: `text-left`.
- Cabeçalho: `font-medium` + borda inferior sutil, nunca background pesado.
- Linhas: `border-b border-zinc-100 dark:border-zinc-800` entre linhas, **nunca** zebra + borda juntos.
- Padding vertical mínimo: `py-3` (12px) por linha.
- Ordenação indicada por ícone + estado (`▲ ▼ ▬`) no cabeçalho.
- Coluna "Atenção" (quando aplicável): sempre com **texto do motivo**, nunca só badge colorida.

### Cores em dashboard
- Além da paleta de estados da seção 3: **nenhuma cor nova**.
- Erro mais frequente (DUPLICATE, UNAVAILABLE, etc.) usa a cor funcional já definida.
- "Precisa de atenção" na tabela = ícone `⚠` + texto do motivo em `text-amber-800`, não row amarela inteira.

### Linguagem
- "Dias em implantação" em vez de "Tempo médio desde createdAt".
- "Erros por tipo" em vez de "ErrorCode distribution".
- Jargão (`p95`, `token`, `JSON`) **só** em tooltips ou em "Detalhes técnicos" recolhido.

### Faixa fixa de simulação
- `role="status"`, cor neutra (zinc), fixada no topo da área de conteúdo:
  **"Dados simulados até 2026-10-15. Nenhum número aqui vem de produção."**
- Nunca é removida sem decisão explícita.
