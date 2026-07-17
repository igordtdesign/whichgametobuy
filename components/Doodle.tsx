"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";

gsap.registerPlugin(Draggable);

/**
 * Doodle SVG decorativo em camadas, pra cada transform viver em paz:
 * - wrapper: flutuação contínua (CSS keyframe)
 * - camada de drag: arrastável via GSAP Draggable, volta elástica ao soltar
 * - camada de flip: espelhamento estático (transform inline; classe Tailwind
 *   era sobrescrita)
 * - img: hover (transition CSS)
 */
interface DoodleProps {
  src: string;
  className?: string;
  duration?: number;
  delay?: number;
  flip?: boolean;
}

export default function Doodle({ src, className, duration = 7, delay = 0, flip }: DoodleProps) {
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragRef.current) return;
    const [instance] = Draggable.create(dragRef.current, {
      type: "x,y",
      onRelease() {
        gsap.to(this.target, { x: 0, y: 0, duration: 1.1, ease: "elastic.out(1, 0.45)" });
      },
    });
    return () => {
      instance.kill();
    };
  }, []);

  return (
    <div
      className={`pointer-events-none absolute ${className ?? ""}`}
      style={{ animation: `doodle-float ${duration}s ${delay}s ease-in-out infinite` }}
      aria-hidden="true"
    >
      <div
        ref={dragRef}
        className="pointer-events-auto cursor-grab touch-none active:cursor-grabbing"
      >
        <div style={flip ? { transform: "scaleX(-1)" } : undefined}>
          <img
            src={src}
            alt=""
            draggable={false}
            className="w-full transition-transform duration-300 ease-out hover:-rotate-6 hover:scale-110"
          />
        </div>
      </div>
    </div>
  );
}
