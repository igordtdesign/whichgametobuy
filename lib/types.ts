export type Locale = "en" | "pt" | "es";

export interface Game {
  appid: number;
  name: string;
  tags: string[];
  /** % de reviews positivas na Steam */
  reviewPct: number;
  reviewCount: number;
  /** descrição curta em inglês — usada como grounding pro LLM */
  short: string;
  adult?: boolean;
}

export interface GamePick {
  game: Game;
  /** XAI: por que este jogo foi recomendado, no idioma do usuário */
  reason: string;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface RecommendRequest {
  turns: ChatTurn[];
  locale: Locale;
  allowAdult: boolean;
}

export interface RecommendResponse {
  reply: string;
  picks: { appid: number; reason: string }[];
  /** true quando nada no catálogo atende o pedido → estado vazio */
  notFound?: boolean;
}
