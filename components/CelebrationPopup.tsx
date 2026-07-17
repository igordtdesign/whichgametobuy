"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Confetti determinístico (sem random pra não divergir entre server/client).
 * Burst radial: cada peça explode do centro numa direção do ângulo áureo,
 * com distância e rotação variando pelo índice.
 */
const COLORS = ["#cfe94e", "#93aa78", "#f2efe1", "#e8846b"];
const PIECES = Array.from({ length: 36 }, (_, i) => {
  const angle = (i * 137.5 * Math.PI) / 180;
  const dist = 130 + (i % 5) * 55;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist * 0.9),
    rot: 240 + ((i * 67) % 480),
    delay: (i % 6) * 0.03,
    duration: 0.9 + (i % 5) * 0.15,
    color: COLORS[i % COLORS.length],
    width: 6 + (i % 3) * 3,
    height: 8 + ((i + 1) % 3) * 4,
  };
});

export default function CelebrationPopup({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-bg/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebrate-title"
    >
      {/* Burst de confetti a partir do centro, contido na janela */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="absolute block rounded-[2px]"
            style={
              {
                left: "50%",
                top: "45%",
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                opacity: 0,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": `${p.rot}deg`,
                animation: `confetti-burst ${p.duration}s ${p.delay}s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="animate-pop-in relative w-full max-w-xs rounded-3xl border border-line bg-surface p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/svg/svgTaskSuccess.svg"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="mx-auto h-24 w-auto transition-transform duration-300 ease-out hover:rotate-3 hover:scale-110"
        />
        <h2 id="celebrate-title" className="mt-3 font-display text-xl font-extrabold">
          {t.celebrateTitle} <span aria-hidden="true">🎉</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">{t.celebrateBody}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-lime px-4 py-2.5 text-sm font-bold text-bg transition-transform hover:-translate-y-0.5 hover:bg-lime-deep"
        >
          {t.celebrateClose}
        </button>
      </div>
    </div>
  );
}
