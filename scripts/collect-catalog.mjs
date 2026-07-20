/**
 * Pipeline de coleta do catálogo (Fase 2 do roadmap).
 *
 * Fontes (ambas públicas, sem chave):
 *  - SteamSpy: lista completa paginada, tags e contagem de reviews
 *    (1 req/s normal; a lista `all` é 1 req/60s)
 *  - Steam appdetails: tipo, descrição e content descriptors (~200 req/5min)
 *
 * Uso:  node scripts/collect-catalog.mjs [--pages 20] [--limit 8000] [--min-reviews 500] [--fresh]
 *   --pages:       páginas da lista completa a varrer (1000 jogos/página,
 *                  por nº de donos). Mais páginas = mais cauda longa.
 *   --limit:       teto TOTAL de jogos no catálogo (inclui os já coletados).
 *   --min-reviews: mínimo de reviews pra entrar (default 500). Baixar isso
 *                  traz mais jogos de nicho, com menos garantia de qualidade.
 *   --fresh:       ignora o catálogo existente e recomeça do zero.
 *
 * RESUMÍVEL: por padrão carrega data/catalog.json existente, pula os appids
 * já coletados e só busca os novos. Então dá pra crescer o catálogo em várias
 * rodadas/noites sem refazer trabalho. Salva a cada 50 jogos; Ctrl+C salva.
 *
 * Nunca rodar em tempo real na request do usuário: coleta em batch e serve
 * do cache. ~2s por jogo novo (rate limits), então 8000 jogos = várias horas.
 */

import fs from "node:fs";
import path from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};
const flag = (name) => process.argv.includes(name);

const PAGES = arg("--pages", 20);
const LIMIT = arg("--limit", 8000);
const MIN_REVIEWS = arg("--min-reviews", 500);
const FRESH = flag("--fresh");
const OUT = path.join(process.cwd(), "data", "catalog.json");

const STEAMSPY_DELAY = 1100; // 1 req/s com folga
const ALL_DELAY = 62000; // lista `all`: 1 req/60s
const APPDETAILS_DELAY = 1600; // ~200 req/5min com folga

// Content descriptors da Steam: 3 = Adult Only Sexual Content, 4 = Frequent Nudity
const ADULT_DESCRIPTORS = [3, 4];
// Tags de alta precisão pra +18 quando o descriptor oficial não existe.
// "Nudity"/"Mature" ficam de fora de propósito (pegariam Cyberpunk, Witcher).
const ADULT_TAGS = ["Sexual Content", "Hentai", "NSFW"];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "whichgametobuy-collector/0.1" } });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}

async function steamspyAllPage(page) {
  console.log(`Buscando página ${page} da lista completa (por nº de donos)...`);
  const data = await fetchJson(`https://steamspy.com/api.php?request=all&page=${page}`);
  await delay(ALL_DELAY);
  return Object.keys(data).map(Number);
}

async function steamspyDetails(appid) {
  const data = await fetchJson(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`);
  await delay(STEAMSPY_DELAY);
  return data;
}

async function storeDetails(appid) {
  const data = await fetchJson(
    `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`,
  );
  await delay(APPDETAILS_DELAY);
  return data?.[appid]?.success ? data[appid].data : null;
}

let games = [];
// appids já no catálogo: pulados na coleta (modo resumível)
const done = new Set();

function loadExisting() {
  if (FRESH || !fs.existsSync(OUT)) return;
  try {
    const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
    if (Array.isArray(prev.games)) {
      games = prev.games;
      games.forEach((g) => done.add(g.appid));
      console.log(`Retomando: ${games.length} jogos já no catálogo serão preservados.\n`);
    }
  } catch (err) {
    console.warn(`Não consegui ler o catálogo existente (${err.message}), começando do zero.\n`);
  }
}

function save() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: games.length, games }, null, 2),
  );
}

async function main() {
  loadExisting();
  console.log(
    `Meta: ${LIMIT} jogos no total, de ${PAGES} páginas (mínimo de ${MIN_REVIEWS} reviews)...\n`,
  );
  if (games.length >= LIMIT) {
    console.log("O catálogo já atingiu a meta. Aumente --limit pra coletar mais.");
    return;
  }

  // Candidatos: lista completa da SteamSpy paginada, ordenada por nº de donos.
  // Já pula os appids que estão no catálogo (resumível).
  const seen = new Set(done);
  const candidates = [];
  for (let p = 0; p < PAGES; p++) {
    if (games.length + candidates.length >= LIMIT * 3) break; // candidatos suficientes
    try {
      for (const appid of await steamspyAllPage(p)) {
        if (!seen.has(appid)) {
          seen.add(appid);
          candidates.push(appid);
        }
      }
    } catch (err) {
      console.warn(`  aviso: página ${p} falhou (${err.message}), seguindo`);
    }
  }
  console.log(`\n${candidates.length} candidatos novos. Enriquecendo...\n`);

  let processed = 0;

  for (const appid of candidates) {
    if (games.length >= LIMIT) break;
    processed++;

    try {
      const spy = await steamspyDetails(appid);
      const positive = spy?.positive ?? 0;
      const negative = spy?.negative ?? 0;
      const total = positive + negative;
      if (!spy?.name || total < MIN_REVIEWS) continue;

      const store = await storeDetails(appid);
      if (!store || store.type !== "game") continue;

      const descriptorIds = store.content_descriptors?.ids ?? [];
      const tags = Object.entries(spy.tags ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name]) => name);

      games.push({
        appid,
        name: store.name,
        tags: tags.length > 0 ? tags : (store.genres ?? []).slice(0, 4).map((g) => g.description),
        reviewPct: Math.round((positive / total) * 100),
        reviewCount: total,
        short: (store.short_description ?? "").slice(0, 300),
        adult:
          descriptorIds.some((id) => ADULT_DESCRIPTORS.includes(id)) ||
          tags.some((t) => ADULT_TAGS.includes(t)) ||
          undefined,
      });

      // Salva incrementalmente: uma queda não joga o progresso fora
      if (games.length % 50 === 0) {
        save();
        console.log(`  ${games.length}/${LIMIT} coletados (${processed} processados) [salvo]`);
      }
    } catch (err) {
      console.warn(`  aviso: appid ${appid} pulado (${err.message})`);
    }
  }

  save();
  console.log(`\nPronto: ${games.length} jogos salvos em ${OUT}`);
  console.log("Reinicia o dev server (ou faça commit + push) pro app usar o catálogo novo.");
}

// Ctrl+C salva o que já coletou antes de sair
process.on("SIGINT", () => {
  console.log("\nInterrompido. Salvando o que já foi coletado...");
  save();
  console.log(`${games.length} jogos salvos em ${OUT}`);
  process.exit(0);
});

main().catch((err) => {
  console.error("Falha na coleta:", err);
  save();
  process.exit(1);
});
