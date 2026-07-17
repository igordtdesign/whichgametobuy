"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function SadPopup({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Overlay absoluto: cobre só a janela do chat, não o site inteiro
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sad-title"
    >
      <div
        className="animate-pop-in w-full max-w-xs rounded-3xl border border-line bg-surface p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/svg/svgTaskFail.svg"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="mx-auto h-24 w-auto transition-transform duration-300 ease-out hover:-rotate-3 hover:scale-110"
        />
        <h2 id="sad-title" className="mt-3 font-display text-xl font-extrabold">
          {t.sadTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t.sadBody}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-bg transition-transform hover:-translate-y-0.5 hover:bg-lime-deep"
        >
          {t.sadStay}
        </button>
      </div>
    </div>
  );
}
