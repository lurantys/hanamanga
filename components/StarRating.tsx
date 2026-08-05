type StarRatingProps = {
  rating: number;
  sizeClass?: string;
};

function StarIcon({ fill, sizeClass }: { fill: number; sizeClass: string }) {
  const path = "M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.56l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z";

  return (
    <span className={`relative inline-block ${sizeClass}`}>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="absolute inset-0 h-full w-full text-zinc-600"
        aria-hidden
      >
        <path d={path} />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fill * 100}%` }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className={sizeClass} aria-hidden>
          <path d={path} />
        </svg>
      </span>
    </span>
  );
}

export function StarRating({
  rating,
  sizeClass = "h-3.5 w-3.5",
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <StarIcon
          key={index}
          fill={Math.max(0, Math.min(1, clamped - index))}
          sizeClass={sizeClass}
        />
      ))}
    </span>
  );
}
