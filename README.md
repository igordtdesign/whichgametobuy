# WhichGameToBuy

Descoberta de jogos por conversa: você descreve o que está afim de jogar e a IA busca na Steam, explicando o porquê de cada recomendação (XAI).

Protótipo v1 de um produto vivo, construído como case de product design. Origem: a dissertação [*SteamAI — Game Discovery with Conversational AI*](https://igordalmolin.com.br) (PUCRS).

## Stack

- **Next.js 15** (App Router) + React 19 + Tailwind 4, deploy na Vercel
- **Gemini Flash** (free tier) para interpretação de intenção e recomendação com grounding no catálogo
- **Steam** (appdetails da loja) + **SteamSpy** para o catálogo, coletado em batch respeitando rate limits
- Animações: CSS + GSAP (Draggable)
- Idiomas: EN, PT-BR e ES com detecção automática

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha a GEMINI_API_KEY (aistudio.google.com/apikey)
npm run dev
```

Sem chave do Gemini, o app roda em modo mock (motor de recomendação local por tags) — útil pra iterar UI.

## Catálogo

```bash
npm run collect   # coleta os tops da SteamSpy + detalhes da loja → data/catalog.json
```

O app usa `data/catalog.json` quando existe; sem ele, cai num catálogo mock de 18 jogos. Nunca consulta a Steam em tempo real: coleta em batch, serve do cache.

## Escopo da v1

Chat de descoberta · cards com capa, tags, reviews e o motivo da recomendação · deep link pra Steam com UTM · estados de erro e vazio desenhados · filtro de conteúdo adulto com age gate.

Fora da v1: login, wishlist, sync de biblioteca, histórico de conversas.

---

Feito por [Igor Dalmolin](https://igordalmolin.com.br) · Sem afiliação com a Valve ou a Steam.
