export type RatingTier = "red" | "yellow" | "green" | "blue";

export function ratingTier(rating: number): RatingTier {
  if (rating < 5) return "red";
  if (rating < 7) return "yellow";
  if (rating < 8.5) return "green";
  return "blue";
}

export const ratingBadgeClass: Record<RatingTier, string> = {
  red: "bg-red-500/15 text-red-300",
  yellow: "bg-yellow-400/15 text-yellow-300",
  green: "bg-emerald-500/15 text-emerald-400",
  blue: "bg-blue-500/15 text-blue-300",
};

export const ratingTextClass: Record<RatingTier, string> = {
  red: "text-red-300",
  yellow: "text-yellow-300",
  green: "text-emerald-400",
  blue: "text-blue-300",
};
