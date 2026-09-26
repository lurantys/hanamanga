export type Genre = {
  name: string;
  tagId: string;
};

export const GENRES: Genre[] = [
  { name: "Action", tagId: "391b0423-d847-456f-aff0-8b0cfc03066b" },
  { name: "Adventure", tagId: "87cc87cd-a395-47af-b27a-93258283bbc6" },
  { name: "Comedy", tagId: "4d32cc48-9f00-4cca-9b5a-a839f0764984" },
  { name: "Drama", tagId: "b9af3a63-f058-46de-a9a0-e0c13906197a" },
  { name: "Fantasy", tagId: "cdc58593-87dd-415e-bbc0-2ec27bf404cc" },
  { name: "Horror", tagId: "cdad7e68-1419-41dd-bdce-27753074a640" },
  { name: "Historical", tagId: "33771934-028e-4cb3-8744-691e866a923e" },
  { name: "Isekai", tagId: "ace04997-f6bd-436e-b261-779182193d3d" },
  { name: "Magical Girls", tagId: "81c836c9-914a-4eca-981a-560dad663e73" },
  { name: "Martial Arts", tagId: "799c202e-7daa-44eb-9cf7-8a3c0441531e" },
  { name: "Mecha", tagId: "50880a9d-5440-4732-9afb-8f457127e836" },
  { name: "Medical", tagId: "c8cbe35b-1b2b-4a3f-9c37-db84c4514856" },
  { name: "Mystery", tagId: "ee968100-4191-4968-93d3-f82d72be7e46" },
  { name: "Philosophical", tagId: "b1e97889-25b4-4258-b28b-cd7f4d28ea9b" },
  { name: "Psychological", tagId: "3b60b75c-a2d7-4860-ab56-05f391bb889c" },
  { name: "Romance", tagId: "423e2eae-a7a2-4a8b-ac03-a8351462d71d" },
  { name: "Sci-Fi", tagId: "256c8bd9-4904-4360-bf4f-508a76d67183" },
  { name: "Superhero", tagId: "7064a261-a137-4d3a-8848-2d385de3a99c" },
  { name: "Supernatural", tagId: "eabc5b4c-6aff-42f3-b657-3e90cbd00b75" },
  { name: "Slice of Life", tagId: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9" },
  { name: "Sports", tagId: "69964a64-2f90-4d33-beeb-f3ed2875eb4c" },
  { name: "Tragedy", tagId: "f8f62932-27da-4fe4-8ee1-6779a8c5edba" },
  { name: "Thriller", tagId: "07251805-a27e-4d59-b488-f0bfbec15168" },
  { name: "Wuxia", tagId: "acc803a4-c95a-4c22-86fc-eb6b582d82a2" },
];

export const GENRE_NAMES = GENRES.map((genre) => genre.name);

export function tagIdFor(name: string): string | undefined {
  return GENRES.find((genre) => genre.name === name)?.tagId;
}

export type SortKey = "trending" | "popular" | "top";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "trending", label: "Trending" },
  { key: "top", label: "Top Rated" },
];

export const SORT_ORDER: Record<SortKey, Record<string, string>> = {
  popular: { followedCount: "desc" },
  trending: { latestUploadedChapter: "desc" },
  top: { rating: "desc" },
};

export function isSortKey(value: string | undefined): value is SortKey {
  return SORTS.some((option) => option.key === value);
}

export const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "Any status" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "hiatus", label: "Hiatus" },
  { key: "cancelled", label: "Cancelled" },
];

export function isStatusKey(value: string | undefined): boolean {
  return value === "" || STATUS_OPTIONS.some((option) => option.key === value);
}

export const RATING_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "All ratings" },
  { key: "safe", label: "Safe" },
  { key: "suggestive", label: "Suggestive" },
  { key: "erotica", label: "Erotica" },
];

export const RATING_VALUES: Record<string, string[]> = {
  safe: ["safe"],
  suggestive: ["safe", "suggestive"],
  erotica: ["safe", "suggestive", "erotica"],
};

export function isRatingKey(value: string | undefined): boolean {
  return value === "" || RATING_OPTIONS.some((option) => option.key === value);
}

export const ORIGIN_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "Any origin" },
  { key: "JP", label: "Manga (Japan)" },
  { key: "KR", label: "Manhwa (Korea)" },
  { key: "CN", label: "Manhua (China)" },
];

export function isOriginKey(value: string | undefined): boolean {
  return (
    value === "" || ORIGIN_OPTIONS.some((option) => option.key === value)
  );
}

export const MIN_SCORE_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "Any score" },
  { key: "7", label: "7.0+" },
  { key: "8", label: "8.0+" },
  { key: "9", label: "9.0+" },
];

export function isMinScoreKey(value: string | undefined): boolean {
  return (
    value === "" || MIN_SCORE_OPTIONS.some((option) => option.key === value)
  );
}

export function sortLabel(key: string | undefined): string {
  return SORTS.find((option) => option.key === key)?.label ?? SORTS[0].label;
}
