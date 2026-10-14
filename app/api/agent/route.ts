import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { tools } from "@/lib/agent-tools";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const passcode = process.env.APP_PASSCODE;

  if (!apiKey || !passcode) {
    return Response.json(
      { error: "Servidor mal configurado." },
      { status: 500 },
    );
  }

  const providedPasscode = request.headers.get("x-passcode");
  if (providedPasscode !== passcode) {
    return Response.json({ error: "Passcode inválido." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  if (
    typeof message !== "string" ||
    message.length < 1 ||
    message.length > 2000
  ) {
    return Response.json(
      { error: "Campo 'message' deve ser string de 1 a 2000 caracteres." },
      { status: 400 },
    );
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";
  const startedAt = Date.now();

  try {
    const result = await generateText({
      model: anthropic(model),
      system:
        "Você é o assistente do back-office de uma empresa de IA para hospitais. Use as ferramentas para cadastrar e listar clientes (hospitais). Se faltar nome ou CNPJ, peça ao usuário; nunca invente dados. Responda em português, em até 5 linhas.",
      prompt: message,
      tools,
      stopWhen: stepCountIs(5),
      maxOutputTokens: 800,
    });

    const trace = result.steps.map((step, index) => ({
      step: index + 1,
      toolCalls: step.toolCalls.map((call) => ({
        toolName: call.toolName,
        input: call.input,
      })),
      toolResults: step.toolResults.map((r) => ({
        toolName: r.toolName,
        output: r.output,
      })),
      text: step.text,
    }));

    return Response.json({
      text: result.text,
      trace,
      stepsCount: result.steps.length,
      usage: {
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
      },
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[/api/agent] erro ao executar o agente:", error);
    return Response.json(
      { error: "Falha ao executar o agente." },
      { status: 502 },
    );
  }
}
