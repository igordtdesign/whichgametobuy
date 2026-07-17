"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer
      className="animate-fade-up flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-5 text-xs text-ink-faint"
      style={{ animationDelay: "0.3s" }}
    >
      <span>
        {t.footerMadeBy}{" "}
        <a
          href="https://igordalmolin.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-ink-dim underline decoration-line underline-offset-4 transition-colors hover:text-lime"
        >
          Igor Dalmolin
        </a>
      </span>
      <span aria-hidden="true">·</span>
      <span>{t.footerDisclaimer}</span>
    </footer>
  );
}
