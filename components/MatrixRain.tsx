/**
 * Cascata estilo Matrix, extremamente sutil (5% de opacidade), atrás de todo
 * o conteúdo. Cada coluna é uma frase icônica de Legend of Zelda escrita na
 * vertical (uma letra por linha). Colunas determinísticas (sem random, pra
 * SSR e cliente renderarem igual) caindo em loop com durações variadas.
 */
const PHRASES = [
  "IT'S DANGEROUS TO GO ALONE! TAKE THIS.",
  "HEY! LISTEN!",
  "IT'S A SECRET TO EVERYBODY.",
  "YOU'VE MET WITH A TERRIBLE FATE, HAVEN'T YOU?",
  "THE FLOW OF TIME IS ALWAYS CRUEL...",
  "OPEN YOUR EYES...",
  "GRUMBLE, GRUMBLE...",
  "DODONGO DISLIKES SMOKE.",
  "LINK... WAKE UP...",
  "MAY THE WAY OF THE HERO LEAD TO THE TRIFORCE.",
];

const COLUMNS = Array.from({ length: 20 }, (_, i) => ({
  left: (i * 100) / 20 + (i % 3) * 1.4,
  duration: 18 + (i % 7) * 4,
  // Delay negativo espalha as colunas pela tela já no primeiro frame
  delay: -((i * 7.3) % 26),
  fontSize: 11 + (i % 3) * 2,
  chars: PHRASES[i % PHRASES.length].split("").join("\n"),
}));

export default function MatrixRain() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
      style={{ opacity: 0.05 }}
      aria-hidden="true"
    >
      {COLUMNS.map((col, i) => (
        <span
          key={i}
          className="absolute top-0 whitespace-pre text-center font-mono leading-[1.5] text-lime"
          style={{
            left: `${col.left}%`,
            fontSize: col.fontSize,
            animation: `matrix-fall ${col.duration}s ${col.delay}s linear infinite`,
          }}
        >
          {col.chars}
        </span>
      ))}
    </div>
  );
}
