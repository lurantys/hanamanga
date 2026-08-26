import type { ReactNode } from "react";

type EmptyStateProps = {
  /** Decorative icon, emoji, or gif rendered above the heading. */
  art?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Action buttons/links rendered under the description. */
  action?: ReactNode;
  className?: string;
};

/**
 * Single empty-state pattern used by every list/grid across the app:
 * boxed card, centered stack, consistent type scale.
 */
export function EmptyState({
  art,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center ${className}`}
    >
      {art}
      <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      ) : null}
    </div>
  );
}
