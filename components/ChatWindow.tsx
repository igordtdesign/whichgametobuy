"use client";

import { useEffect, useRef, useState } from "react";
import CelebrationPopup from "@/components/CelebrationPopup";
import Doodle from "@/components/Doodle";
import GameCard, { type RecommendedGame } from "@/components/GameCard";
import SadPopup from "@/components/SadPopup";
import { track } from "@/lib/analytics";
import { localizeTag, useI18n } from "@/lib/i18n";
import type { ChatTurn } from "@/lib/types";

const MAX_INPUT_LENGTH = 280;
const MAX_USER_MESSAGES = 12;

interface Message {
  id: number;
  role: "user" | "bot";
  kind: "normal" | "empty" | "error";
  text: string;
  games?: RecommendedGame[];
}

let nextId = 1;

export default function ChatWindow({ allowAdult }: { allowAdult: boolean }) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [sadOpen, setSadOpen] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [thankedIds, setThankedIds] = useState<Set<number>>(new Set());
  const [celebrating, setCelebrating] = useState(false);
  const [expandedCard, setExpandedCard] = useState<{
    msgId: number;
    game: RecommendedGame;
    index: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const expandedPanelRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const limitReached = userMessageCount >= MAX_USER_MESSAGES;
  const showSuggestions =
    !loading && (messages.length === 0 || messages[messages.length - 1]?.kind === "empty");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Painel XAI fecha com clique fora dele ou Esc (dentro fecha via onClick)
  useEffect(() => {
    if (!expandedCard) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (expandedPanelRef.current && !expandedPanelRef.current.contains(e.target as Node)) {
        setExpandedCard(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedCard(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedCard]);

  const buildTurns = (history: Message[], pendingUserText: string): ChatTurn[] => {
    const turns: ChatTurn[] = history
      .filter((m) => m.kind === "normal")
      .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text }));
    turns.push({ role: "user", text: pendingUserText });
    return turns;
  };

  const send = async (rawText: string, options?: { isRetry?: boolean }) => {
    const text = rawText.trim().slice(0, MAX_INPUT_LENGTH);
    if (!text || loading || limitReached) return;

    // Funil: ativação (1ª mensagem) + profundidade (nº da mensagem na sessão)
    if (!options?.isRetry) {
      if (userMessageCount === 0) track("first_message_sent");
      track("message_sent", { turn: userMessageCount + 1 });
    }

    setFailedText(null);
    setExpandedCard(null);
    setMessages((prev) => {
      const withoutError = prev.filter((m) => m.kind !== "error");
      if (options?.isRetry) return withoutError;
      return [...withoutError, { id: nextId++, role: "user", kind: "normal", text }];
    });
    setInput("");
    setLoading(true);

    try {
      const history = messages.filter((m) => m.kind === "normal");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: buildTurns(options?.isRetry ? history.slice(0, -1) : history, text),
          locale,
          allowAdult,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.notFound || !data.games?.length) {
        track("no_results");
        setMessages((prev) => [
          ...prev,
          { id: nextId++, role: "bot", kind: "empty", text: data.reply || "" },
        ]);
      } else {
        track("recommendations_shown", { count: data.games.length });
        setMessages((prev) => [
          ...prev,
          { id: nextId++, role: "bot", kind: "normal", text: data.reply, games: data.games },
        ]);
      }
    } catch {
      track("error_shown");
      setFailedText(text);
      setMessages((prev) => [...prev, { id: nextId++, role: "bot", kind: "error", text: "" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleUseful = (id: number) => {
    setThankedIds((prev) => new Set(prev).add(id));
    setCelebrating(true);
    track("recommendation_useful");
  };

  const handleNewSearch = () => {
    setMessages([]);
    setFailedText(null);
    setExpandedCard(null);
    inputRef.current?.focus();
  };

  const handleRefine = () => inputRef.current?.focus();

  const lastMessageId = messages[messages.length - 1]?.id;

  return (
    <div className="animate-pop-in flex w-full justify-center">
      <div
        className={`relative w-full transition-[max-width] duration-500 ease-out ${
          maximized ? "max-w-4xl" : "max-w-3xl"
        }`}
      >
        {/* Doodles decorativos orbitando a janela */}
        <Doodle
          src="/svg/svgObjUFO.svg"
          className="-top-16 right-8 hidden w-24 md:block"
          duration={8}
        />
        <Doodle
          src="/svg/svgObjMoney.svg"
          className="-left-24 top-1/3 hidden w-20 -rotate-6 lg:block"
          duration={9}
          delay={0.6}
        />
        <Doodle
          src="/svg/svgObjBars.svg"
          className="-right-28 bottom-16 hidden w-24 rotate-3 lg:block"
          duration={7}
          delay={1.2}
        />
      <section
        className={`relative flex w-full flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_40px_100px_-24px_rgba(0,0,0,0.85),0_0_0_1px_rgba(207,233,78,0.04)] ${
          bouncing ? "animate-window-bounce" : ""
        }`}
        aria-label={t.windowTitle}
        onAnimationEnd={(e) => {
          if (e.animationName === "window-bounce") setBouncing(false);
        }}
      >
        {/* Chrome da janela */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <button
            type="button"
            onClick={() => setSadOpen(true)}
            aria-label={t.btnClose}
            title={t.btnClose}
            className="size-2.5 rounded-full bg-danger/80 transition-transform hover:scale-125 hover:bg-danger"
          />
          <button
            type="button"
            onClick={() => setBouncing(true)}
            aria-label={t.btnMinimize}
            title={t.btnMinimize}
            className="size-2.5 rounded-full bg-moss/80 transition-transform hover:scale-125 hover:bg-moss"
          />
          <button
            type="button"
            onClick={() => setMaximized((v) => !v)}
            aria-label={maximized ? t.btnRestore : t.btnMaximize}
            title={maximized ? t.btnRestore : t.btnMaximize}
            className="size-2.5 rounded-full bg-lime/80 transition-transform hover:scale-125 hover:bg-lime"
          />
          <p className="flex-1 text-center text-xs font-semibold tracking-wide text-ink-faint">
            {t.windowTitle}
          </p>
          <div className="flex w-[52px] justify-end">
            <button
              type="button"
              onClick={handleNewSearch}
              aria-label={t.refreshChat}
              className="group relative flex size-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-lime"
            >
              <span className="pointer-events-none absolute right-full mr-2 translate-x-1 whitespace-nowrap rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[10px] font-bold text-ink-dim opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                {t.refreshChat}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-500 ease-out group-hover:rotate-[300deg]"
              >
                <path
                  d="M13.5 8a5.5 5.5 0 1 1-1.7-3.97"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M13.8 1.6v3h-3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        className={`chat-scroll flex min-h-[360px] flex-col gap-5 overflow-y-auto px-4 py-6 transition-[height] duration-500 ease-out sm:px-6 ${
          maximized ? "h-[62dvh] sm:max-h-[640px]" : "h-[58dvh] sm:h-[56dvh] sm:max-h-[600px]"
        }`}
      >
        {/* Boas-vindas */}
        <BotRow>
          <p className="max-w-[52ch] text-sm leading-relaxed text-ink-dim sm:text-[15px]">
            {t.welcome}
          </p>
        </BotRow>

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="animate-msg-in flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-lime px-4 py-2.5 text-sm font-semibold leading-relaxed text-bg sm:text-[15px]">
                  {msg.text}
                </p>
              </div>
            );
          }
          if (msg.kind === "error") {
            return (
              <BotRow key={msg.id}>
                <div className="w-full max-w-md rounded-2xl border border-danger/40 bg-danger/5 p-4">
                  <p className="font-display text-base font-bold text-danger">{t.errorTitle}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-dim">{t.errorBody}</p>
                  <button
                    type="button"
                    onClick={() => failedText && send(failedText, { isRetry: true })}
                    className="mt-3 rounded-full border border-danger/50 px-4 py-1.5 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-bg"
                  >
                    {t.retry}
                  </button>
                </div>
              </BotRow>
            );
          }
          if (msg.kind === "empty") {
            return (
              <BotRow key={msg.id}>
                <div className="w-full max-w-md rounded-2xl border border-dashed border-line p-5 text-center">
                  <p className="font-display text-3xl font-extrabold text-moss" aria-hidden="true">
                    ∅
                  </p>
                  <p className="mt-2 font-display text-base font-bold">{t.emptyTitle}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-dim">
                    {msg.text || t.emptyBody}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-ink-faint">{t.emptyHint}</p>
                </div>
              </BotRow>
            );
          }
          return (
            <BotRow key={msg.id}>
              <div className="flex w-full flex-col gap-3">
                <p className="max-w-[52ch] whitespace-pre-line text-sm leading-relaxed text-ink-dim sm:text-[15px]">
                  {msg.text}
                </p>
                {msg.games && (
                  <div className="relative">
                    {/* Mobile: carrossel horizontal com snap. Desktop: grid de 3 */}
                    <div className="chat-scroll -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-x-visible sm:px-0 sm:pb-0">
                      {msg.games.map((game, i) => (
                        <div
                          key={game.appid}
                          className="animate-fade-up w-[76%] shrink-0 snap-center sm:w-auto"
                          style={{
                            animationDelay: `${i * 0.35}s`,
                            animationDuration: "0.65s",
                            // Ease-in acentuado: o card chega devagar antes de assentar
                            animationTimingFunction: "cubic-bezier(0.55, 0.06, 0.35, 1)",
                          }}
                        >
                          <GameCard
                            game={game}
                            onExpand={() => setExpandedCard({ msgId: msg.id, game, index: i })}
                          />
                        </div>
                      ))}
                    </div>

    {/* Painel XAI expandido: o card clicado se estica sobre os outros dois */}
                    {expandedCard?.msgId === msg.id && (
                      <div
                        ref={expandedPanelRef}
                        onClick={() => setExpandedCard(null)}
                        className="absolute inset-0 z-10 cursor-pointer overflow-y-auto rounded-2xl border border-moss/50 bg-surface-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)]"
                        style={{
                          transformOrigin: ["left center", "center center", "right center"][
                            expandedCard.index
                          ],
                          animation: "card-morph 0.45s cubic-bezier(0.34, 1.7, 0.5, 1) both",
                        }}
                      >
                        <div
                          className="flex h-full flex-col gap-2.5 p-4"
                          style={{ animation: "fade-up 0.25s 0.12s both" }}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={expandedCard.game.coverUrl}
                              alt=""
                              className="h-10 w-[86px] shrink-0 rounded-md object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-display text-sm font-bold">
                                {expandedCard.game.name}
                              </h4>
                              <p className="text-[11px] font-bold text-moss">
                                ★ {t.reviewLabel(expandedCard.game.reviewPct)} ·{" "}
                                {t.reviews(expandedCard.game.reviewPct)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedCard(null)}
                              aria-label={t.btnClose}
                              className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-line hover:text-ink"
                            >
                              <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                <path
                                  d="M1 1l8 8M9 1L1 9"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>

                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-lime">
                              {t.whyThis}
                            </p>
                            <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-ink-dim">
                              {expandedCard.game.reason}
                            </p>
                          </div>

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                            <ul className="flex flex-wrap gap-1.5">
                              {expandedCard.game.tags.slice(0, 4).map((tag) => (
                                <li
                                  key={tag}
                                  className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-dim"
                                >
                                  {localizeTag(tag, locale)}
                                </li>
                              ))}
                            </ul>
                            <a
                              href={expandedCard.game.steamUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                track("steam_link_clicked", {
                                  appid: expandedCard.game.appid,
                                  name: expandedCard.game.name,
                                  from: "expanded",
                                });
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3.5 py-1.5 text-xs font-bold text-bg transition-transform hover:-translate-y-0.5 hover:bg-lime-deep"
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
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {msg.games &&
                  msg.id === lastMessageId &&
                  !loading &&
                  (thankedIds.has(msg.id) ? (
                    <p className="animate-msg-in text-sm font-semibold text-moss">
                      {t.ctaThanks}
                    </p>
                  ) : (
                    <div
                      className="animate-fade-up flex flex-wrap items-center gap-2 pt-1"
                      style={{
                        animationDelay: `${msg.games.length * 0.35 + 0.2}s`,
                        animationDuration: "0.5s",
                      }}
                    >
                      <span className="mr-1 text-xs font-bold uppercase tracking-wide text-ink-faint">
                        {t.ctaQuestion}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUseful(msg.id)}
                        className="rounded-full border border-lime px-3.5 py-1.5 text-xs font-bold text-lime transition-colors hover:bg-lime hover:text-bg"
                      >
                        ✓ {t.ctaUseful}
                      </button>
                      <button
                        type="button"
                        onClick={handleNewSearch}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
                      >
                        {t.ctaNewSearch}
                      </button>
                      <button
                        type="button"
                        onClick={handleRefine}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
                      >
                        {t.ctaRefine}
                      </button>
                    </div>
                  ))}
              </div>
            </BotRow>
          );
        })}

        {loading && (
          <BotRow>
            <div className="flex items-center gap-2 text-sm text-ink-faint">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="animate-dot size-1.5 rounded-full bg-moss"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              {t.thinking}
            </div>
          </BotRow>
        )}

        {limitReached && (
          <p className="mx-auto max-w-sm text-center text-xs font-semibold text-ink-faint">
            {t.limitReached}
          </p>
        )}

        {showSuggestions && !limitReached && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {t.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-dim transition-colors hover:border-lime hover:text-lime"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entrada */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-3 sm:p-4">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.inputPlaceholder}
          maxLength={MAX_INPUT_LENGTH}
          disabled={loading || limitReached}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-2 focus:ring-lime/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || limitReached}
          aria-label={t.send}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-bg transition-transform hover:-translate-y-0.5 hover:bg-lime-deep disabled:translate-y-0 disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

      {sadOpen && <SadPopup onClose={() => setSadOpen(false)} />}
      {celebrating && <CelebrationPopup onClose={() => setCelebrating(false)} />}
      </section>
      </div>
    </div>
  );
}

/** Linha de mensagem do bot com o avatar ✦ */
function BotRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-msg-in flex items-start gap-3">
      <span
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 font-display text-sm font-bold text-lime"
        aria-hidden="true"
      >
        ✦
      </span>
      {children}
    </div>
  );
}
