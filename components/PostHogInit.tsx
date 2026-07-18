"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Inicializa o PostHog no cliente. Sem NEXT_PUBLIC_POSTHOG_KEY, não faz nada
 * (o app roda normal, só sem analytics). Renderiza null.
 */
export default function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
    });
  }, []);
  return null;
}
