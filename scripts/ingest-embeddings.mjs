/**
 * Ingestão: catálogo -> embeddings (Gemini) -> Supabase (Estágio 3).
 *
 * Rode assim (o --env-file carrega as chaves do .env.local, Node 20+):
 *   node --env-file=.env.local scripts/ingest-embeddings.mjs
 *
 * Precisa no .env.local:
 *   SUPABASE_URL=https://xxxxx.supabase.co
 *   SUPABASE_SECRET_KEY=sb_secret_...   (secreta; ignora RLS; só servidor)
 *   GEMINI_API_KEY=...                  (a mesma que já usas)
 *
 * RESUMÍVEL: pula os jogos que já têm embedding no Supabase, então dá pra
 * rodar em partes. Faz backoff em 429 (limite de taxa). ~10k jogos levam
 * alguns minutos.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
// aceita os dois nomes: SUPABASE_SECRET_KEY (novo) ou SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-embedding-001";
const DIMS = 768; // dimensão do vetor (bate com o schema.sql)
const BATCH = 50; // jogos por chamada de embedding e por upsert
// Free tier: 1000 embeddings/min, e cada jogo conta como 1. Fica abaixo disso.
const RPM_LIMIT = 900;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY no .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** L2-normaliza: recomendado pra dimensões != 3072 do gemini-embedding-001 */
function normalize(v) {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Texto que representa o jogo pro embedding */
function gameText(g) {
  return `${g.name}\nTags: ${(g.tags ?? []).join(", ")}\n${g.short ?? ""}`.slice(0, 2000);
}

// Controle de taxa proativo: nunca passa de RPM_LIMIT jogos por minuto.
let windowStart = Date.now();
let itemsInWindow = 0;
async function throttle(count) {
  if (itemsInWindow + count > RPM_LIMIT) {
    const wait = Math.max(0, 61000 - (Date.now() - windowStart));
    if (wait > 0) {
      console.log(`  aguardando ${Math.ceil(wait / 1000)}s pro limite de ${RPM_LIMIT}/min...`);
      await delay(wait);
    }
    windowStart = Date.now();
    itemsInWindow = 0;
  }
  itemsInWindow += count;
}

/** Embedding em lote, com backoff em 429 (lendo o "retry in Xs" da resposta) */
async function embedBatch(texts, attempt = 0) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        requests: texts.map((t) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text: t }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: DIMS,
        })),
      }),
    },
  );

  if (res.ok) {
    const data = await res.json();
    return data.embeddings.map((e) => normalize(e.values));
  }

  const body = await res.text();
  if (res.status === 429 && attempt < 8) {
    const m = body.match(/retry in ([\d.]+)s/i);
    const wait = m ? (parseFloat(m[1]) + 2) * 1000 : 2 ** attempt * 5000;
    console.log(`  limite atingido, esperando ${Math.ceil(wait / 1000)}s...`);
    await delay(wait);
    // reseta a janela: o minuto rolou
    windowStart = Date.now();
    itemsInWindow = 0;
    return embedBatch(texts, attempt + 1);
  }
  throw new Error(`embedding ${res.status}: ${body.slice(0, 200)}`);
}

async function loadDoneAppids() {
  const done = new Set();
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("games")
      .select("appid")
      .not("embedding", "is", null)
      .range(offset, offset + 999);
    if (error) throw new Error(`Supabase select: ${error.message}`);
    data.forEach((r) => done.add(r.appid));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return done;
}

async function main() {
  const file = path.join(process.cwd(), "data", "catalog.json");
  const { games } = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Catálogo: ${games.length} jogos.`);

  console.log("Checando o que já está no Supabase...");
  const done = await loadDoneAppids();
  const pending = games.filter((g) => !done.has(g.appid));
  console.log(`${done.size} já ingeridos, ${pending.length} pendentes.\n`);

  let ingested = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    try {
      await throttle(batch.length);
      const vectors = await embedBatch(batch.map(gameText));
      const rows = batch.map((g, j) => ({
        appid: g.appid,
        name: g.name,
        tags: g.tags ?? [],
        review_pct: g.reviewPct,
        review_count: g.reviewCount,
        short: g.short ?? null,
        adult: Boolean(g.adult),
        embedding: `[${vectors[j].join(",")}]`,
      }));
      const { error } = await supabase.from("games").upsert(rows, { onConflict: "appid" });
      if (error) throw new Error(`Supabase upsert: ${error.message}`);

      ingested += batch.length;
      console.log(`  ${ingested}/${pending.length} ingeridos...`);
    } catch (err) {
      console.warn(`  aviso: lote ${i}-${i + batch.length} falhou (${err.message})`);
      await delay(3000);
    }
  }

  console.log(`\nPronto: ${ingested} jogos ingeridos nesta rodada.`);
}

main().catch((err) => {
  console.error("Falha na ingestão:", err.message);
  process.exit(1);
});
