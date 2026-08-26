import { StarIcon } from "./icons";

type StarRatingProps = {
  sizeClass?: string;
  className?: string;
};

export function StarRating({
  sizeClass = "h-3.5 w-3.5",
  className,
}: StarRatingProps) {
  return (
    <span className="inline-flex items-center" aria-hidden>
      <StarIcon className={`${sizeClass} ${className ?? ""} shrink-0`} />
    </span>
  );
}
