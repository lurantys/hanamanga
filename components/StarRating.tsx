type StarRatingProps = {
  sizeClass?: string;
  className?: string;
};

function StarIcon({ sizeClass, className }: { sizeClass: string; className?: string }) {
  const path = "M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.56l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`${sizeClass} ${className ?? ""} shrink-0`}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function StarRating({
  sizeClass = "h-3.5 w-3.5",
  className,
}: StarRatingProps) {
  return (
    <span className="inline-flex items-center" aria-hidden>
      <StarIcon sizeClass={sizeClass} className={className} />
    </span>
  );
}
