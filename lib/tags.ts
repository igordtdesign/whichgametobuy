import type { Locale } from "./types";

/**
 * Rótulos localizados das tags do catálogo (as tags internas ficam em inglês).
 * Módulo sem "use client" pra poder ser usado tanto na UI quanto na API.
 */
const tagLabels: Record<string, { pt: string; es: string }> = {
  Farming: { pt: "Fazenda", es: "Granja" },
  Cozy: { pt: "Cozy", es: "Cozy" },
  "Pixel Art": { pt: "Pixel Art", es: "Pixel Art" },
  Relaxing: { pt: "Relaxante", es: "Relajante" },
  Roguelike: { pt: "Roguelike", es: "Roguelike" },
  Action: { pt: "Ação", es: "Acción" },
  Mythology: { pt: "Mitologia", es: "Mitología" },
  Metroidvania: { pt: "Metroidvania", es: "Metroidvania" },
  Atmospheric: { pt: "Atmosférico", es: "Atmosférico" },
  Difficult: { pt: "Difícil", es: "Difícil" },
  Platformer: { pt: "Plataforma", es: "Plataformas" },
  "Story Rich": { pt: "Rico em história", es: "Gran historia" },
  Casual: { pt: "Casual", es: "Casual" },
  "Short Sessions": { pt: "Sessões curtas", es: "Sesiones cortas" },
  Deckbuilder: { pt: "Deckbuilder", es: "Deckbuilder" },
  Strategy: { pt: "Estratégia", es: "Estrategia" },
  Puzzle: { pt: "Puzzle", es: "Puzzle" },
  Exploration: { pt: "Exploração", es: "Exploración" },
  Wholesome: { pt: "Wholesome", es: "Wholesome" },
  Building: { pt: "Construção", es: "Construcción" },
  "Co-op": { pt: "Co-op", es: "Co-op" },
  FPS: { pt: "FPS", es: "FPS" },
  Multiplayer: { pt: "Multiplayer", es: "Multijugador" },
  RPG: { pt: "RPG", es: "RPG" },
  Fantasy: { pt: "Fantasia", es: "Fantasía" },
  Long: { pt: "Longo", es: "Largo" },
  Adventure: { pt: "Aventura", es: "Aventura" },
  Management: { pt: "Gerenciamento", es: "Gestión" },
  Emotional: { pt: "Emocionante", es: "Emotivo" },
  "Turn-Based": { pt: "Por turnos", es: "Por turnos" },
  Detective: { pt: "Detetive", es: "Detective" },
  Sandbox: { pt: "Sandbox", es: "Sandbox" },
  Survival: { pt: "Sobrevivência", es: "Supervivencia" },
  Simulation: { pt: "Simulação", es: "Simulación" },
  Satisfying: { pt: "Satisfatório", es: "Satisfactorio" },
};

export function localizeTag(tag: string, locale: Locale): string {
  if (locale === "en") return tag;
  return tagLabels[tag]?.[locale] ?? tag;
}
