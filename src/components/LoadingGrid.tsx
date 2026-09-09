"use client";

import { useEffect, useRef, useState } from "react";
import { useCrawlStatus } from "@/store/crawlStatus";

const GRID = 3;

export default function LoadingGrid({
  dotSize = 34,
  gap = 14,
  className = "",
}: {
  dotSize?: number;
  gap?: number;
  className?: string;
}) {
  const collecting = useCrawlStatus((s) => s.collecting);
  const [current, setCurrent] = useState(Math.floor(Math.random() * 9));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const neighbors = (idx: number): number[] => {
    const r = Math.floor(idx / GRID);
    const c = idx % GRID;
    const list: number[] = [];
    if (r > 0) list.push(idx - GRID);
    if (r < GRID - 1) list.push(idx + GRID);
    if (c > 0) list.push(idx - 1);
    if (c < GRID - 1) list.push(idx + 1);
    return list;
  };

  useEffect(() => {
    if (!collecting) return;
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        setCurrent((prev) => {
          const options = neighbors(prev);
          return options[Math.floor(Math.random() * options.length)];
        });
        schedule();
      }, 220 + Math.random() * 320);
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [collecting]);

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID}, ${dotSize}px)`,
        gridTemplateRows: `repeat(${GRID}, ${dotSize}px)`,
        gap: `${gap}px`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: GRID * GRID }).map((_, i) => (
        <span
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: i === current ? "#ff3b30" : collecting ? "rgba(255,255,255,0.28)" : "#fff",
            boxShadow: i === current ? "0 0 14px rgba(255,59,48,0.75)" : "none",
            transition: "background 180ms ease",
          }}
        />
      ))}
    </div>
  );
}