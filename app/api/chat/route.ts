import { NextResponse } from "next/server";
import { findGame, getCatalog, steamHeaderUrl, steamStoreUrl } from "@/lib/catalog";
import { geminiRecommend } from "@/lib/gemini";
import { mockRecommend, preselectCandidates } from "@/lib/recommend";
import { isSupabaseConfigured, vectorSearch } from "@/lib/supabase";
import type { Game, RecommendRequest } from "@/lib/types";

// Vercel Hobby: função serverless com padrão de 10s; Gemini + fallback podem
// passar disso, então estende o limite
export const maxDuration = 60;

const MAX_TURNS = 24;
const MAX_MESSAGE_LENGTH = 280;

/**
 * Candidatos pro Gemini: busca vetorial no Supabase (semântica) com fallback
 * pra pré-seleção por tag no catálogo local. Assim o site nunca fica sem
 * recomendação, mesmo se o Supabase estiver fora.
 */
async function getCandidates(req: RecommendRequest): Promise<Game[]> {
  if (isSupabaseConfigured()) {
    try {
      const found = await vectorSearch(req, 24);
      if (found.length > 0) return found;
    } catch (err) {
      console.warn("[/api/chat] busca vetorial falhou, usando catálogo local:", err);
    }
  }
  const pool = getCatalog().filter((g) => (req.allowAdult ? true : !g.adult));
  return preselectCandidates(req.turns, pool, 40);
}

export async function POST(request: Request) {
  let body: RecommendRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!Array.isArray(body.turns) || body.turns.length === 0) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (body.turns.length > MAX_TURNS) {
    return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  }

  const locale = ["en", "pt", "es"].includes(body.locale) ? body.locale : "en";
  const req: RecommendRequest = {
    locale,
    allowAdult: Boolean(body.allowAdult),
    turns: body.turns.map((t) => ({
      role: t.role === "model" ? "model" : "user",
      text: String(t.text ?? "").slice(0, MAX_MESSAGE_LENGTH),
    })),
  };

  try {
    let result;
    let candidates: Game[] = [];
    if (process.env.GEMINI_API_KEY) {
      candidates = await getCandidates(req);
      try {
        result = await geminiRecommend(req, candidates);
      } catch (err) {
        // Degradação graciosa: Gemini indisponível não derruba o produto
        console.error("[/api/chat] Gemini indisponível, usando motor mock:", err);
        result = mockRecommend(req);
      }
    } else {
      result = mockRecommend(req);
    }

    const byId = new Map(candidates.map((g) => [g.appid, g]));
    const games = result.picks
      .map((p) => {
        const game = byId.get(p.appid) ?? findGame(p.appid);
        if (!game) return null;
        return {
          appid: game.appid,
          name: game.name,
          tags: game.tags,
          reviewPct: game.reviewPct,
          reviewCount: game.reviewCount,
          reason: p.reason,
          coverUrl: steamHeaderUrl(game.appid),
          steamUrl: steamStoreUrl(game.appid),
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      reply: result.reply,
      games,
      notFound: Boolean(result.notFound) || games.length === 0,
    });
  } catch (err) {
    console.error("[/api/chat]", err);
    return NextResponse.json({ error: "recommendation_failed" }, { status: 500 });
  }
}
