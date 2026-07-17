"use client";

import { useEffect, useRef, useState } from "react";
import AgeGate from "@/components/AgeGate";
import { LOCALES, useI18n } from "@/lib/i18n";

interface HeaderProps {
  allowAdult: boolean;
  onAllowAdultChange: (value: boolean) => void;
}

export default function Header({ allowAdult, onAllowAdultChange }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!langOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [langOpen]);

  const handleAdultClick = () => {
    if (allowAdult) {
      onAllowAdultChange(false);
    } else {
      setAgeGateOpen(true);
    }
  };

  return (
    <header className="animate-fade-up flex items-center justify-between px-4 py-4 sm:px-8">
      <a href="/" className="font-display text-lg font-extrabold tracking-tight sm:text-xl">
        WhichGameToBuy<span className="text-lime">.</span>
      </a>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleAdultClick}
          aria-pressed={allowAdult}
          title={t.adultToggle}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
            allowAdult
              ? "border-lime bg-lime text-bg"
              : "border-line text-ink-dim hover:border-ink-faint hover:text-ink"
          }`}
        >
          18+
        </button>

        <div ref={langRef} className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            aria-label={t.langMenuLabel}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
          >
            <span aria-hidden="true">{current.flag}</span>
            {current.label}
            <svg
              width="8"
              height="5"
              viewBox="0 0 8 5"
              fill="none"
              aria-hidden="true"
              className={`transition-transform ${langOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M1 1l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {langOpen && (
            <ul
              role="listbox"
              aria-label={t.langMenuLabel}
              className="animate-fade-up absolute right-0 top-full z-30 mt-2 w-28 rounded-2xl border border-line bg-surface-2 p-1 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.7)]"
              style={{ animationDuration: "0.25s" }}
            >
              {LOCALES.map(({ code, label, flag }) => (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={locale === code}
                    onClick={() => {
                      setLocale(code);
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      locale === code
                        ? "bg-lime text-bg"
                        : "text-ink-dim hover:bg-surface-3 hover:text-ink"
                    }`}
                  >
                    <span aria-hidden="true">{flag}</span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {ageGateOpen && (
        <AgeGate
          onConfirm={() => {
            onAllowAdultChange(true);
            setAgeGateOpen(false);
          }}
          onCancel={() => setAgeGateOpen(false)}
        />
      )}
    </header>
  );
}
