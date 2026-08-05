"use client";

import { useState } from "react";

type ExpandableDescriptionProps = {
  text: string;
  limit?: number;
  className?: string;
};

function truncated(text: string, limit: number): string {
  const sliced = text.slice(0, limit);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.7 ? lastSpace : limit;
  return `${sliced.slice(0, cut).trimEnd()}…`;
}

export function ExpandableDescription({
  text,
  limit = 280,
  className = "",
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const needsTruncation = text.length > limit;
  const shown = needsTruncation && !expanded ? truncated(text, limit) : text;

  return (
    <div className={className}>
      <p>{shown}</p>
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1.5 text-sm font-bold text-red-400 transition-colors hover:text-red-300"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
