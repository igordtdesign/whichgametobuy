import fs from "node:fs";
import path from "node:path";
import type { Game } from "./types";

/**
 * Catálogo mock de fallback — jogos reais da Steam com appids reais.
 * Quando data/catalog.json existe (gerado por scripts/collect-catalog.mjs),
 * ele tem prioridade. Próximo passo do roadmap: Supabase + pgvector.
 */
const MOCK_CATALOG: Game[] = [
  {
    appid: 413150,
    name: "Stardew Valley",
    tags: ["Farming", "Cozy", "Pixel Art", "Relaxing"],
    reviewPct: 98,
    reviewCount: 640000,
    short: "Inherit a farm, grow crops, befriend a small town. The definitive cozy farming sim.",
  },
  {
    appid: 1145360,
    name: "Hades",
    tags: ["Roguelike", "Action", "Mythology", "Story Rich"],
    reviewPct: 98,
    reviewCount: 250000,
    short: "Fast rogue-like dungeon crawler where you defy the god of the dead. Runs of 20-40 minutes.",
  },
  {
    appid: 367520,
    name: "Hollow Knight",
    tags: ["Metroidvania", "Atmospheric", "Difficult", "Exploration"],
    reviewPct: 97,
    reviewCount: 340000,
    short: "Haunting hand-drawn metroidvania in a vast ruined kingdom of insects.",
  },
  {
    appid: 504230,
    name: "Celeste",
    tags: ["Platformer", "Difficult", "Story Rich", "Pixel Art"],
    reviewPct: 97,
    reviewCount: 90000,
    short: "Brutally precise platformer about climbing a mountain and dealing with anxiety.",
  },
  {
    appid: 1794680,
    name: "Vampire Survivors",
    tags: ["Roguelike", "Casual", "Short Sessions", "Action"],
    reviewPct: 98,
    reviewCount: 250000,
    short: "Minimal-input bullet heaven. Perfect 30-minute runs that melt hours.",
  },
  {
    appid: 646570,
    name: "Slay the Spire",
    tags: ["Deckbuilder", "Roguelike", "Strategy", "Turn-Based"],
    reviewPct: 97,
    reviewCount: 190000,
    short: "The deckbuilding roguelike that started a genre. One more run, always.",
  },
  {
    appid: 1135690,
    name: "Unpacking",
    tags: ["Cozy", "Puzzle", "Relaxing", "Short Sessions"],
    reviewPct: 96,
    reviewCount: 20000,
    short: "Zen puzzle game about unpacking boxes across a life's moves. Quiet storytelling.",
  },
  {
    appid: 1055540,
    name: "A Short Hike",
    tags: ["Cozy", "Exploration", "Short Sessions", "Wholesome"],
    reviewPct: 98,
    reviewCount: 30000,
    short: "Climb a mountain at your own pace in this warm, tiny open world. Finished in an afternoon.",
  },
  {
    appid: 1455840,
    name: "Dorfromantik",
    tags: ["Puzzle", "Relaxing", "Building", "Strategy"],
    reviewPct: 95,
    reviewCount: 20000,
    short: "Peaceful tile-laying puzzle where you grow an idyllic landscape.",
  },
  {
    appid: 548430,
    name: "Deep Rock Galactic",
    tags: ["Co-op", "FPS", "Multiplayer", "Action"],
    reviewPct: 97,
    reviewCount: 300000,
    short: "1-4 player co-op mining FPS. Dwarves, darkness, and friendly chaos. Rock and stone!",
  },
  {
    appid: 1086940,
    name: "Baldur's Gate 3",
    tags: ["RPG", "Story Rich", "Fantasy", "Long"],
    reviewPct: 96,
    reviewCount: 600000,
    short: "Massive story-driven RPG with unmatched freedom of choice. Hundreds of hours.",
  },
  {
    appid: 1868140,
    name: "Dave the Diver",
    tags: ["Adventure", "Management", "Casual", "Story Rich"],
    reviewPct: 97,
    reviewCount: 120000,
    short: "Dive by day, run a sushi bar by night. Endlessly charming genre mashup.",
  },
  {
    appid: 972660,
    name: "Spiritfarer",
    tags: ["Cozy", "Management", "Emotional", "Story Rich"],
    reviewPct: 95,
    reviewCount: 40000,
    short: "A cozy management game about caring for spirits before saying goodbye.",
  },
  {
    appid: 1244090,
    name: "Sea of Stars",
    tags: ["RPG", "Turn-Based", "Pixel Art", "Story Rich"],
    reviewPct: 94,
    reviewCount: 30000,
    short: "Retro-inspired turn-based RPG with gorgeous pixel art and timing-based combat.",
  },
  {
    appid: 1426210,
    name: "It Takes Two",
    tags: ["Co-op", "Multiplayer", "Adventure", "Platformer"],
    reviewPct: 96,
    reviewCount: 220000,
    short: "Two-player-only co-op adventure that reinvents itself every level.",
  },
  {
    appid: 1290000,
    name: "PowerWash Simulator",
    tags: ["Relaxing", "Simulation", "Satisfying", "Casual"],
    reviewPct: 97,
    reviewCount: 80000,
    short: "Wash the dirt. Feel the calm. The most satisfying chore ever made.",
  },
  {
    appid: 632470,
    name: "Disco Elysium",
    tags: ["RPG", "Story Rich", "Detective", "Atmospheric"],
    reviewPct: 95,
    reviewCount: 120000,
    short: "Groundbreaking detective RPG where your skills argue inside your head.",
  },
  {
    appid: 105600,
    name: "Terraria",
    tags: ["Sandbox", "Survival", "Multiplayer", "Exploration"],
    reviewPct: 97,
    reviewCount: 1000000,
    short: "2D sandbox of digging, building and boss fights. Infinite by design.",
  },
];

let cached: Game[] | null = null;

export function getCatalog(): Game[] {
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "data", "catalog.json");
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(parsed.games) && parsed.games.length > 0) {
        cached = parsed.games as Game[];
        console.log(`[catalog] usando data/catalog.json (${cached.length} jogos)`);
        return cached;
      }
    }
  } catch (err) {
    console.warn("[catalog] falha ao ler data/catalog.json, usando mock:", err);
  }
  cached = MOCK_CATALOG;
  return cached;
}

export function findGame(appid: number): Game | undefined {
  return getCatalog().find((g) => g.appid === appid);
}

export function steamHeaderUrl(appid: number): string {
  return `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
}

export function steamStoreUrl(appid: number): string {
  const utm = "utm_source=whichgametobuy&utm_medium=chat&utm_campaign=v1_prototype";
  return `https://store.steampowered.com/app/${appid}/?${utm}`;
}
