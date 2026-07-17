"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "./types";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "es", label: "ES", flag: "🇪🇸" },
];

interface Dict {
  tagline1: string;
  tagline2: string;
  windowTitle: string;
  welcome: string;
  suggestions: string[];
  inputPlaceholder: string;
  send: string;
  thinking: string;
  whyThis: string;
  viewOnSteam: string;
  reviews: (pct: number) => string;
  reviewLabel: (pct: number) => string;
  emptyTitle: string;
  emptyBody: string;
  emptyHint: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  limitReached: string;
  adultToggle: string;
  ageGateTitle: string;
  ageGateBody: string;
  ageGateConfirm: string;
  ageGateCancel: string;
  footerMadeBy: string;
  footerDisclaimer: string;
  langMenuLabel: string;
  btnClose: string;
  btnMinimize: string;
  btnMaximize: string;
  btnRestore: string;
  sadTitle: string;
  sadBody: string;
  sadStay: string;
  ctaQuestion: string;
  ctaUseful: string;
  ctaNewSearch: string;
  ctaRefine: string;
  ctaThanks: string;
  celebrateTitle: string;
  celebrateBody: string;
  celebrateClose: string;
  refreshChat: string;
}

const dicts: Record<Locale, Dict> = {
  en: {
    tagline1: "Tell me what you're looking for.",
    tagline2: "I'll find a game for you!",
    windowTitle: "WhichGameToBuy",
    welcome:
      "Hi! Describe the kind of game you're craving: mood, time you have, genres you love or hate. I'll dig through Steam for you.",
    suggestions: [
      "Something cozy for 30 min a day",
      "A hard roguelike like Hades",
      "Co-op to play with friends",
    ],
    inputPlaceholder: "e.g. a relaxing farming game with a good story…",
    send: "Send",
    thinking: "Digging through the catalog…",
    whyThis: "Why this one?",
    viewOnSteam: "View on Steam",
    reviews: (pct) => `${pct}% positive`,
    reviewLabel: (pct) =>
      pct >= 95 ? "Overwhelmingly Positive" : pct >= 85 ? "Very Positive" : "Mostly Positive",
    emptyTitle: "Nothing in my shelf matches that",
    emptyBody:
      "I couldn't find a good match in my catalog, and I'd rather admit it than recommend something mediocre.",
    emptyHint: "Try a different angle: a mood, a genre, or a game you already love.",
    errorTitle: "That one's on me",
    errorBody: "Something broke while I was searching. Your message is safe, so let's try again.",
    retry: "Try again",
    limitReached:
      "We've been chatting for a while! Start a fresh conversation to keep recommendations sharp.",
    adultToggle: "Adult content",
    ageGateTitle: "Adult content",
    ageGateBody:
      "This will include games with explicit sexual content in recommendations. Confirm that you are 18 or older.",
    ageGateConfirm: "I'm 18 or older",
    ageGateCancel: "Keep it filtered",
    footerMadeBy: "Made by",
    footerDisclaimer: "Prototype v1 · Not affiliated with Valve or Steam",
    langMenuLabel: "Language",
    btnClose: "Close",
    btnMinimize: "Minimize",
    btnMaximize: "Expand",
    btnRestore: "Shrink",
    sadTitle: "Don't close me :(",
    sadBody: "I haven't even found your next game yet. One more chance?",
    sadStay: "Fine, you can stay",
    ctaQuestion: "Did this help?",
    ctaUseful: "That's the one!",
    ctaNewSearch: "New search",
    ctaRefine: "Add more details",
    ctaThanks: "Nice! Good game, and come back for the next one.",
    celebrateTitle: "Found it!",
    celebrateBody: "Mission accomplished. May it bring you many great hours of play.",
    celebrateClose: "Have fun!",
    refreshChat: "Start a new chat",
  },
  pt: {
    tagline1: "Me conte o que você busca.",
    tagline2: "Eu encontro um jogo para você!",
    windowTitle: "WhichGameToBuy",
    welcome:
      "Oi! Me descreve o tipo de jogo que você tá afim: clima, tempo livre, gêneros que ama ou odeia. Eu vasculho a Steam pra você.",
    suggestions: [
      "Algo cozy pra 30 min por dia",
      "Um roguelike difícil tipo Hades",
      "Co-op pra jogar com os amigos",
    ],
    inputPlaceholder: "ex: um jogo relaxante de fazenda com uma boa história…",
    send: "Enviar",
    thinking: "Vasculhando o catálogo…",
    whyThis: "Por que esse?",
    viewOnSteam: "Ver na Steam",
    reviews: (pct) => `${pct}% positivas`,
    reviewLabel: (pct) =>
      pct >= 95
        ? "Extremamente positivas"
        : pct >= 85
          ? "Muito positivas"
          : "Majoritariamente positivas",
    emptyTitle: "Nada na minha estante combina com isso",
    emptyBody:
      "Não achei nada à altura no meu catálogo, e prefiro admitir do que recomendar algo mais ou menos.",
    emptyHint: "Tenta por outro ângulo: um clima, um gênero, ou um jogo que você já ama.",
    errorTitle: "Essa foi minha",
    errorBody:
      "Alguma coisa quebrou enquanto eu buscava. Sua mensagem tá salva, bora tentar de novo.",
    retry: "Tentar de novo",
    limitReached:
      "A gente já conversou bastante! Começa uma conversa nova pra manter as recomendações afiadas.",
    adultToggle: "Conteúdo adulto",
    ageGateTitle: "Conteúdo adulto",
    ageGateBody:
      "Isso vai incluir jogos com conteúdo sexual explícito nas recomendações. Confirme que você tem 18 anos ou mais.",
    ageGateConfirm: "Tenho 18 anos ou mais",
    ageGateCancel: "Manter filtrado",
    footerMadeBy: "Feito por",
    footerDisclaimer: "Protótipo v1 · Sem afiliação com a Valve ou a Steam",
    langMenuLabel: "Idioma",
    btnClose: "Fechar",
    btnMinimize: "Minimizar",
    btnMaximize: "Aumentar",
    btnRestore: "Reduzir",
    sadTitle: "Não me fecha :(",
    sadBody: "Eu ainda nem achei o seu próximo jogo. Me dá mais uma chance?",
    sadStay: "Tá bom, pode ficar",
    ctaQuestion: "Te ajudei?",
    ctaUseful: "Achei meu jogo!",
    ctaNewSearch: "Nova busca",
    ctaRefine: "Dar mais detalhes",
    ctaThanks: "Boa! Bom jogo, e volta pro próximo.",
    celebrateTitle: "Achou!",
    celebrateBody: "Missão cumprida. Que renda muitas horas de jogo!",
    celebrateClose: "Bom jogo!",
    refreshChat: "Começar um novo chat",
  },
  es: {
    tagline1: "Cuéntame qué buscas.",
    tagline2: "¡Yo encuentro un juego para ti!",
    windowTitle: "WhichGameToBuy",
    welcome:
      "¡Hola! Describe el tipo de juego que te apetece: ambiente, tiempo disponible, géneros que amas u odias. Yo busco en Steam por ti.",
    suggestions: [
      "Algo cozy para 30 min al día",
      "Un roguelike difícil tipo Hades",
      "Co-op para jugar con amigos",
    ],
    inputPlaceholder: "ej: un juego relajante de granja con buena historia…",
    send: "Enviar",
    thinking: "Revisando el catálogo…",
    whyThis: "¿Por qué este?",
    viewOnSteam: "Ver en Steam",
    reviews: (pct) => `${pct}% positivas`,
    reviewLabel: (pct) =>
      pct >= 95
        ? "Extremadamente positivas"
        : pct >= 85
          ? "Muy positivas"
          : "Mayormente positivas",
    emptyTitle: "Nada en mi estantería encaja con eso",
    emptyBody:
      "No encontré nada a la altura en mi catálogo, y prefiero admitirlo antes que recomendar algo mediocre.",
    emptyHint: "Prueba otro ángulo: un ambiente, un género, o un juego que ya te encante.",
    errorTitle: "Esa fue culpa mía",
    errorBody: "Algo se rompió mientras buscaba. Tu mensaje está a salvo. Intentémoslo de nuevo.",
    retry: "Intentar de nuevo",
    limitReached:
      "¡Ya llevamos un buen rato! Empieza una conversación nueva para mantener las recomendaciones afiladas.",
    adultToggle: "Contenido adulto",
    ageGateTitle: "Contenido adulto",
    ageGateBody:
      "Esto incluirá juegos con contenido sexual explícito en las recomendaciones. Confirma que tienes 18 años o más.",
    ageGateConfirm: "Tengo 18 años o más",
    ageGateCancel: "Mantener filtrado",
    footerMadeBy: "Hecho por",
    footerDisclaimer: "Prototipo v1 · Sin afiliación con Valve ni Steam",
    langMenuLabel: "Idioma",
    btnClose: "Cerrar",
    btnMinimize: "Minimizar",
    btnMaximize: "Ampliar",
    btnRestore: "Reducir",
    sadTitle: "No me cierres :(",
    sadBody: "Todavía no encontré tu próximo juego. ¿Me das otra oportunidad?",
    sadStay: "Está bien, te quedas",
    ctaQuestion: "¿Te ayudé?",
    ctaUseful: "¡Encontré mi juego!",
    ctaNewSearch: "Nueva búsqueda",
    ctaRefine: "Dar más detalles",
    ctaThanks: "¡Genial! Buen juego, y vuelve para el próximo.",
    celebrateTitle: "¡Lo encontraste!",
    celebrateBody: "Misión cumplida. ¡Que te dé muchas horas de juego!",
    celebrateClose: "¡A jugar!",
    refreshChat: "Empezar un chat nuevo",
  },
};

export { localizeTag } from "./tags";

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("es")) return "es";
  return "en";
}

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("wgtb.locale") as Locale | null;
    setLocaleState(saved && saved in dicts ? saved : detectLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("wgtb.locale", l);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dicts[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
