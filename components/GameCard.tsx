"use client";

import Image from "next/image";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

export interface RecommendedGame {
  appid: number;
  name: string;
  tags: string[];
  reviewPct: number;
  reviewCount: number;
  reason: string;
  coverUrl: string;
  steamUrl: string;
}

export default function GameCard({
  game,
  onExpand,
}: {
  game: RecommendedGame;
  onExpand: () => void;
}) {
  const { t } = useI18n();

  // O card inteiro expande o XAI; só o link da Steam interrompe a propagação
  return (
    <article
      onClick={onExpand}
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 transition-colors hover:border-ink-faint"
    >
      <div className="relative aspect-[460/215] shrink-0">
        <Image
          src={game.coverUrl}
          alt={game.name}
          fill
          sizes="(max-width: 640px) 100vw, 240px"
          className="object-cover"
          unoptimized
        />
        <span
          className="absolute right-1.5 top-1.5 rounded-full bg-bg/85 px-2 py-0.5 text-[11px] font-bold text-moss backdrop-blur-sm"
          title={`${t.reviewLabel(game.reviewPct)} · ${t.reviews(game.reviewPct)}`}
        >
          ★ {game.reviewPct}%
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3
          className="line-clamp-1 font-display text-sm font-bold leading-snug"
          title={game.name}
        >
          {game.name}
        </h3>

        <button
          type="button"
          onClick={onExpand}
          className="flex items-center justify-between gap-2 rounded-lg bg-surface-3 px-2.5 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-lime transition-colors hover:bg-line"
        >
          {t.whyThis}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M6 1h3v3M9 1L5.5 4.5M4 9H1V6M1 9l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <a
          href={game.steamUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            track("steam_link_clicked", { appid: game.appid, name: game.name });
          }}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-bg transition-transform hover:-translate-y-0.5 hover:bg-lime-deep"
        >
          {t.viewOnSteam}
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2 10L10 2M10 2H4M10 2V8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}
