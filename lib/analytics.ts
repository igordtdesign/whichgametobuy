import posthog from "posthog-js";

/**
 * Wrapper fino sobre o PostHog. No-op se a chave não estiver configurada
 * (dev sem env, ou modo mock), então chamar track() é sempre seguro.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
}
