"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flash-highlight a chapter row after jump/navigation.
 * Timer matches the 2s `animate-chapter-highlight` animation.
 */
export function useChapterFlash(timeoutMs = 2200) {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const timerRef = useRef(0);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const flash = (chapterId: string) => {
    setHighlightId(chapterId);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setHighlightId(null), timeoutMs);
  };

  return { highlightId, flash };
}
