import { getCatalog } from "./catalog";
import { localizeTag } from "./tags";
import type { ChatTurn, Game, Locale, RecommendRequest, RecommendResponse } from "./types";

/**
 * Motor mock: mapeia palavras da mensagem pra tags do catálogo e rankeia.
 * Serve pra iterar UI sem depender do Gemini. A resposta imita o formato
 * que o LLM vai devolver (reply + picks com motivo XAI).
 */

const keywordToTags: [RegExp, string[]][] = [
  [/\b(cozy|aconcheg|acogedor|chill|calm[oa]?|tranquil|wholesome|fofo)\w*/i, ["Cozy", "Wholesome", "Relaxing"]],
  [/\b(relax|zen|descans|desestres)\w*/i, ["Relaxing", "Cozy", "Satisfying"]],
  [/\b(fazenda|farm|granja|agricult|plantar|colheita|cosecha)\w*/i, ["Farming"]],
  [/\b(curt[oa]s?|short|corto|r[áa]pid[oa]|30 ?min|meia hora|media hora|pouco tempo|poco tiempo)\w*/i, ["Short Sessions", "Casual"]],
  [/\b(co-?op|cooperativ|amig[oa]s|friends|juntos|multi ?player|multijugador|online)\w*/i, ["Co-op", "Multiplayer"]],
  [/\b(hist[óo]ria|story|historia|narrativ|enredo|trama)\w*/i, ["Story Rich"]],
  [/\b(dif[íi]cil|hard(core)?|desafi|challeng|punish|brutal)\w*/i, ["Difficult"]],
  [/\brpg\b/i, ["RPG"]],
  [/\b(rogue-?li[kt]e|hades)\w*/i, ["Roguelike"]],
  [/\b(puzzle|quebra-?cabe[çc]a|rompecabezas|l[óo]gica)\w*/i, ["Puzzle"]],
  [/\b(pixel|retr[ôo]|8-?bit|16-?bit)\w*/i, ["Pixel Art"]],
  [/\b(estrat[ée]gia|strategy|estrategia|t[áa]tic|deck)\w*/i, ["Strategy", "Deckbuilder", "Turn-Based"]],
  [/\b(explorar?|explora[çc]|exploration|metroidvania|mundo aberto|open world)\w*/i, ["Exploration", "Metroidvania", "Sandbox"]],
  [/\b(a[çc][ãa]o|action|acci[óo]n|frenetic|shooter|fps|tiro)\w*/i, ["Action", "FPS"]],
  [/\b(constru|build|sandbox|criar|crear|craft)\w*/i, ["Building", "Sandbox"]],
  [/\b(gerenci|manage|gesti[óo]n|administrar|tycoon)\w*/i, ["Management"]],
  [/\b(emocion|emotivo|chorar|llorar|cry|tocante)\w*/i, ["Emotional", "Story Rich"]],
  [/\b(simula|simulator)\w*/i, ["Simulation"]],
  [/\b(fantasia|fantasy|fantas[íi]a|drag[õoa]es|dragones|medieval)\w*/i, ["Fantasy", "RPG"]],
  [/\b(detetive|detective|investiga|mist[ée]rio|misterio|noir)\w*/i, ["Detective", "Story Rich"]],
  [/\b(sobreviv|surviv|supervivencia)\w*/i, ["Survival"]],
  [/\b(plataforma|platform|celeste|mario)\w*/i, ["Platformer"]],
  [/\b(long[oa]|largo|100 ?h|centenas de horas|imersivo|inmersivo)\w*/i, ["Long", "RPG"]],
  [/\b(turno|turn-?based|por turnos)\w*/i, ["Turn-Based"]],
];

const replyTemplates: Record<Locale, { found: string[]; refine: string }> = {
  en: {
    found: [
      "Got it: I looked for {vibes} and these three earned their spot:",
      "Nice brief. Filtering for {vibes}, here's what stood out:",
      "Okay, {vibes} it is. Three picks I'd defend:",
    ],
    refine: "Want me to refine? Try “cheaper”, “shorter”, or “something like the first one but multiplayer”.",
  },
  pt: {
    found: [
      "Entendi: busquei por {vibes} e esses três mereceram a vaga:",
      "Bom briefing. Filtrando por {vibes}, isso aqui se destacou:",
      "Fechado, {vibes} então. Três escolhas que eu banco:",
    ],
    refine: "Quer refinar? Tenta “mais barato”, “mais curto”, ou “parecido com o primeiro, mas multiplayer”.",
  },
  es: {
    found: [
      "Entendido: busqué {vibes} y estos tres se ganaron el puesto:",
      "Buen briefing. Filtrando por {vibes}, esto es lo que destacó:",
      "Perfecto, {vibes} entonces. Tres elecciones que defiendo:",
    ],
    refine: "¿Quieres afinar? Prueba “más barato”, “más corto”, o “parecido al primero pero multijugador”.",
  },
};

const reasonTemplates: Record<Locale, string[]> = {
  en: [
    "Matches what you asked for: {tags}. {pct}% positive reviews back it up.",
    "Nails the {tags} brief, and players agree ({pct}% positive).",
    "Picked for {tags}. One of the highest-rated in its lane ({pct}%).",
  ],
  pt: [
    "Bate com o que você pediu: {tags}. {pct}% de reviews positivas confirmam.",
    "Acerta em cheio no clima {tags}, e os jogadores concordam ({pct}% positivas).",
    "Escolhido por {tags}. Um dos mais bem avaliados nessa vibe ({pct}%).",
  ],
  es: [
    "Encaja con lo que pediste: {tags}. Un {pct}% de reseñas positivas lo respalda.",
    "Da en el clavo con {tags}, y los jugadores están de acuerdo ({pct}% positivas).",
    "Elegido por {tags}. Uno de los mejor valorados en su estilo ({pct}%).",
  ],
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function extractWantedTags(text: string): Set<string> {
  const wanted = new Set<string>();
  for (const [pattern, tags] of keywordToTags) {
    if (pattern.test(text)) tags.forEach((t) => wanted.add(t));
  }
  return wanted;
}

/**
 * Pré-seleção de candidatos pro prompt do Gemini: retrieval simples por tag
 * + popularidade, até a busca vetorial (pgvector) entrar. Mantém o prompt
 * pequeno mesmo com catálogo de centenas de jogos.
 */
export function preselectCandidates(turns: ChatTurn[], games: Game[], max = 40): Game[] {
  const text = turns
    .filter((t) => t.role === "user")
    .slice(-3)
    .map((t) => t.text)
    .join(" ");
  const wanted = extractWantedTags(text);
  return games
    .map((g) => ({ g, s: g.tags.filter((t) => wanted.has(t)).length }))
    .sort((a, b) => b.s - a.s || b.g.reviewCount - a.g.reviewCount)
    .slice(0, max)
    .map((x) => x.g);
}

export function mockRecommend(req: RecommendRequest): RecommendResponse {
  const lastUser = [...req.turns].reverse().find((t) => t.role === "user")?.text ?? "";
  const wantedTags = extractWantedTags(lastUser);

  if (wantedTags.size === 0) {
    return { reply: "", picks: [], notFound: true };
  }

  const scored = getCatalog()
    .filter((g) => (req.allowAdult ? true : !g.adult))
    .map((g) => ({
      game: g,
      score: g.tags.filter((t) => wantedTags.has(t)).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.game.reviewPct - a.game.reviewPct);

  if (scored.length === 0) {
    return { reply: "", picks: [], notFound: true };
  }

  const top = scored.slice(0, 3);
  const seed = lastUser.length;
  const vibes = [...wantedTags]
    .slice(0, 3)
    .map((t) => localizeTag(t, req.locale))
    .join(" + ");
  const { found, refine } = replyTemplates[req.locale];
  const reply = `${fill(found[seed % found.length], { vibes })}\n\n${refine}`;

  const picks = top.map(({ game }, i) => ({
    appid: game.appid,
    reason: buildReason(game, wantedTags, req.locale, seed + i),
  }));

  return { reply, picks };
}

function buildReason(game: Game, wanted: Set<string>, locale: Locale, seed: number): string {
  const matched = game.tags.filter((t) => wanted.has(t));
  const shown = (matched.length > 0 ? matched : game.tags)
    .slice(0, 3)
    .map((t) => localizeTag(t, locale))
    .join(" · ");
  const tpl = reasonTemplates[locale][seed % reasonTemplates[locale].length];
  return fill(tpl, { tags: shown, pct: String(game.reviewPct) });
}
