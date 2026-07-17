"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n";

interface AgeGateProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeGate({ onConfirm, onCancel }: AgeGateProps) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Portal pro body: o header animado tem transform, que viraria o
  // containing block do position:fixed e prenderia o modal lá dentro
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agegate-title"
    >
      <div
        className="animate-pop-in w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-3xl font-extrabold text-lime">18+</p>
        <h2 id="agegate-title" className="mt-2 font-display text-lg font-bold">
          {t.ageGateTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t.ageGateBody}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-bg transition-transform hover:-translate-y-0.5 hover:bg-lime-deep"
          >
            {t.ageGateConfirm}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-line px-4 py-2.5 text-sm font-bold text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
          >
            {t.ageGateCancel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
