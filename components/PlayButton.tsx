"use client";

import { useWip } from "./WipProvider";
import { BookOpenIcon, InfoIcon } from "./icons";
import { ctaPrimary, ctaSecondary } from "@/lib/ui";
import type { Manga } from "@/lib/mangadex";

type PlayButtonProps = {
  manga: Manga;
  variant?: "read" | "info";
  className?: string;
};

export function PlayButton({
  manga,
  variant = "read",
  className = "",
}: PlayButtonProps) {
  const { openWip } = useWip();

  if (variant === "info") {
    return (
      <button
        type="button"
        onClick={() => openWip(manga)}
        className={`${ctaSecondary} ${className}`}
      >
        <InfoIcon />
        More Info
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openWip(manga)}
      className={`${ctaPrimary} ${className}`}
    >
      <BookOpenIcon />
      Read Now
    </button>
  );
}
