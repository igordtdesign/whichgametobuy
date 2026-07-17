"use client";

import Doodle from "@/components/Doodle";
import { useI18n } from "@/lib/i18n";

export default function Tagline() {
  const { t } = useI18n();
  return (
    <div className="animate-fade-up relative mb-5" style={{ animationDelay: "0.15s" }}>
      <p className="max-w-xl text-balance text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        <span className="block">{t.tagline1}</span>
        <span className="mt-1 block font-script text-3xl font-normal leading-snug text-lime sm:text-4xl">
          {t.tagline2}
        </span>
      </p>
      <Doodle
        src="/svg/svgObjBubble.svg"
        className="-left-20 -top-6 hidden w-16 sm:block"
        duration={6}
      />
    </div>
  );
}
