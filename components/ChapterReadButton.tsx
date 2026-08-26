"use client";

import { useWip } from "./WipProvider";
import { BookOpenIcon } from "./icons";
import { chipButton } from "@/lib/ui";

type ChapterReadButtonProps = {
  label: string;
  className?: string;
};

export function ChapterReadButton({ label, className = "" }: ChapterReadButtonProps) {
  const { openWip } = useWip();

  return (
    <button
      type="button"
      onClick={() => openWip()}
      className={`${chipButton} ${className}`}
    >
      <BookOpenIcon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
