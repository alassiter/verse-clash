"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const WOBBLE_INTERVAL_MS = 30_000;
const NUDGE_INTERVAL_MS = 5_000;

function replay(el: HTMLElement | null, className: string) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export function AnimatedLogo() {
  const wobbleRef = useRef<HTMLDivElement>(null);
  const nudgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    replay(wobbleRef.current, "logo-wobble");
    const wobbleId = window.setInterval(
      () => replay(wobbleRef.current, "logo-wobble"),
      WOBBLE_INTERVAL_MS,
    );
    const nudgeId = window.setInterval(
      () => replay(nudgeRef.current, "logo-nudge"),
      NUDGE_INTERVAL_MS,
    );
    return () => {
      window.clearInterval(wobbleId);
      window.clearInterval(nudgeId);
    };
  }, []);

  return (
    <div ref={wobbleRef} className="w-full max-w-md sm:max-w-lg">
      <div ref={nudgeRef}>
        <Image
          src="/brand/verse-clash-logo-full.png"
          alt="Verse Clash"
          width={560}
          height={560}
          priority
          className="w-full"
        />
      </div>
    </div>
  );
}
