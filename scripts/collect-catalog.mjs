/**
 * Pipeline de coleta do catálogo (Fase 2 do roadmap).
 *
 * Fontes (ambas públicas, sem chave):
 *  - SteamSpy: listas de tops, tags e contagem de reviews (1 req/s)
 *  - Steam appdetails: tipo, descrição e content descriptors (~200 req/5min)
 *
 * Uso:  node scripts/collect-catalog.mjs [--limit 250]
 * Saída: data/catalog.json (o app usa esse arquivo automaticamente se existir;
 *        sem ele, cai no catálogo mock de 18 jogos)
 *
 * Nunca rodar em tempo real na request do usuário: coleta em batch e serve
 * do cache. Rodada completa com 250 jogos leva ~15 min.
 */

import fs from "node:fs";
import path from "node:path";

const LIMIT = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 250;
const MIN_REVIEWS = 500;
const OUT = path.join(process.cwd(), "data", "catalog.json");

const STEAMSPY_DELAY = 1100; // 1 req/s com folga
const APPDETAILS_DELAY = 1600; // ~200 req/5min com folga

// Content descriptors da Steam: 3 = Adult Only Sexual Content, 4 = Frequent Nudity
const ADULT_DESCRIPTORS = [3, 4];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "whichgametobuy-collector/0.1" } });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}

async function steamspyList(request) {
  console.log(`Buscando lista SteamSpy: ${request}...`);
  const data = await fetchJson(`https://steamspy.com/api.php?request=${request}`);
  await delay(STEAMSPY_DELAY);
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

async function main() {
  console.log(`Coletando até ${LIMIT} jogos (mínimo de ${MIN_REVIEWS} reviews)...\n`);

  // Candidatos: união dos tops da SteamSpy, na ordem das listas
  const lists = ["top100in2weeks", "top100forever", "top100owned"];
  const seen = new Set();
  const candidates = [];
  for (const list of lists) {
    for (const appid of await steamspyList(list)) {
      if (!seen.has(appid)) {
        seen.add(appid);
        candidates.push(appid);
      }
    }
  }
  console.log(`${candidates.length} candidatos únicos.\n`);

  const games = [];
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
        adult: descriptorIds.some((id) => ADULT_DESCRIPTORS.includes(id)) || undefined,
      });

      if (games.length % 10 === 0) {
        console.log(`  ${games.length}/${LIMIT} coletados (${processed} processados)...`);
      }
    } catch (err) {
      console.warn(`  aviso: appid ${appid} pulado (${err.message})`);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: games.length, games }, null, 2),
  );
  console.log(`\nPronto: ${games.length} jogos salvos em ${OUT}`);
  console.log("Reinicia o dev server pro app passar a usar o catálogo real.");
}

main().catch((err) => {
  console.error("Falha na coleta:", err);
  process.exit(1);
});
