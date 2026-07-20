import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Game, RecommendRequest } from "./types";

// Só servidor. A chave secreta NUNCA tem NEXT_PUBLIC_, então nunca vai pro
// cliente. Aceita os dois nomes de variável.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) client = createClient(url!, key!, { auth: { persistSession: false } });
  return client;
}

/** Só usa busca vetorial se Supabase E Gemini (pro embedding) estiverem prontos */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && key && process.env.GEMINI_API_KEY);
}

/** L2-normaliza: consistente com como os embeddings foram gravados */
function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768,
      }),
    },
  );
  if (!res.ok) throw new Error(`embed query ${res.status}`);
  const data = await res.json();
  return normalize(data.embedding.values);
}

/**
 * Busca vetorial: embeda as últimas mensagens do usuário e traz os jogos mais
 * próximos via match_games, já filtrando conteúdo adulto conforme o toggle.
 */
export async function vectorSearch(req: RecommendRequest, limit = 24): Promise<Game[]> {
  const text = req.turns
    .filter((t) => t.role === "user")
    .slice(-3)
    .map((t) => t.text)
    .join(" ")
    .trim();
  if (!text) return [];

  const embedding = await embedQuery(text);
  const { data, error } = await getClient().rpc("match_games", {
    query_embedding: embedding,
    match_count: limit,
    include_adult: req.allowAdult,
  });
  if (error) throw new Error(`match_games: ${error.message}`);

  return (data ?? []).map(
    (r: {
      appid: number;
      name: string;
      tags: string[] | null;
      review_pct: number;
      review_count: number;
      short: string | null;
      adult: boolean;
    }): Game => ({
      appid: r.appid,
      name: r.name,
      tags: r.tags ?? [],
      reviewPct: r.review_pct,
      reviewCount: r.review_count,
      short: r.short ?? "",
      adult: r.adult || undefined,
    }),
  );
}
