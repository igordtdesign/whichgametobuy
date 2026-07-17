import { findGame, getCatalog } from "./catalog";
import { preselectCandidates } from "./recommend";
import type { RecommendRequest, RecommendResponse } from "./types";

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  pt: "Brazilian Portuguese",
  es: "Spanish",
};

/**
 * Free tier do AI Studio: só os modelos mais recentes têm cota (os antigos
 * retornam 429 com limit 0), e os recém-lançados sofrem 503 de sobrecarga.
 * Por isso a cadeia: tenta o preferido e cai pro próximo em qualquer falha.
 */
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

/**
 * Recomendação via Gemini, com o catálogo como grounding.
 * O modelo só pode escolher jogos da lista de candidatos — nunca inventar.
 */
export async function geminiRecommend(req: RecommendRequest): Promise<RecommendResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const preferred = process.env.GEMINI_MODEL;
  const models = preferred
    ? [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)]
    : [...FALLBACK_MODELS];

  let lastError: unknown;
  for (const model of models) {
    try {
      return await callModel(model, apiKey, req);
    } catch (err) {
      lastError = err;
      console.warn(
        `[gemini] ${model} falhou: ${err instanceof Error ? err.message.slice(0, 200) : err}`,
      );
    }
  }
  throw lastError;
}

async function callModel(
  model: string,
  apiKey: string,
  req: RecommendRequest,
): Promise<RecommendResponse> {
  const pool = getCatalog().filter((g) => (req.allowAdult ? true : !g.adult));
  const candidates = preselectCandidates(req.turns, pool, 40)
    .map(
      (g) =>
        `- appid ${g.appid}: ${g.name} | tags: ${g.tags.join(", ")} | ${g.reviewPct}% positive | ${g.short}`,
    )
    .join("\n");

  const systemPrompt = `You are the recommendation engine of WhichGameToBuy, a Steam game discovery chat.

RULES:
- Reply ONLY in ${LOCALE_NAMES[req.locale] ?? "English"}. Keep the tone casual and friendly. For Portuguese, ALWAYS use informal Brazilian Portuguese ("você", never "tu" conjugations, never European Portuguese).
- Recommend up to 3 games, ONLY from the candidate list below. Never invent games.
- For each pick, write a specific one-sentence reason tied to what the user asked (explainable AI: "why this one").
- If nothing in the list truly fits, return an empty picks array and set notFound to true. Never force a weak match.
- Only discuss game discovery. If the user goes off-topic, gently steer back in one sentence and set notFound to false with empty picks.
- Be concise and honest. Admit uncertainty when relevant. No marketing fluff.
- Never use em dashes (—) or en dashes (–) in any text. Use commas, colons or periods instead.

CANDIDATE GAMES:
${candidates}

Return JSON: {"reply": string, "picks": [{"appid": number, "reason": string}], "notFound": boolean}`;

  const contents = req.turns.slice(-12).map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      // Sem timeout, um modelo sobrecarregado pendura a request por mais de
      // 1 min e o fallback nunca dispara
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
          // Modelos com "thinking" gastam parte do orçamento em raciocínio
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.find((p) => typeof p.text === "string")?.text;
  if (!text) throw new Error("Empty Gemini response");

  const parsed = JSON.parse(text) as RecommendResponse;
  // Garante que só jogos reais do catálogo passam pro frontend
  parsed.picks = (parsed.picks ?? []).filter((p) => findGame(p.appid)).slice(0, 3);
  return parsed;
}
