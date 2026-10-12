import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

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
        "Você é um assistente de um back-office de agentes. Responda em português, em até 5 linhas.",
      prompt: message,
      maxOutputTokens: 500,
    });

    return Response.json({
      text: result.text,
      usage: {
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
      },
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[/api/chat] erro ao chamar o modelo:", error);
    return Response.json(
      { error: "Falha ao gerar resposta." },
      { status: 502 },
    );
  }
}
