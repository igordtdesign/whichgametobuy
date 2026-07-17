import { NextResponse } from "next/server";
import { findGame, steamHeaderUrl, steamStoreUrl } from "@/lib/catalog";
import { geminiRecommend } from "@/lib/gemini";
import { mockRecommend } from "@/lib/recommend";
import type { RecommendRequest } from "@/lib/types";

// Vercel Hobby: função serverless com padrão de 10s; Gemini + fallback podem
// passar disso, então estende o limite
export const maxDuration = 60;

const MAX_TURNS = 24;
const MAX_MESSAGE_LENGTH = 280;

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
    if (process.env.GEMINI_API_KEY) {
      try {
        result = await geminiRecommend(req);
      } catch (err) {
        // Degradação graciosa: Gemini indisponível não derruba o produto
        console.error("[/api/chat] Gemini indisponível, usando motor mock:", err);
        result = mockRecommend(req);
      }
    } else {
      result = mockRecommend(req);
    }

    const games = result.picks
      .map((p) => {
        const game = findGame(p.appid);
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
