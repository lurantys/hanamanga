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
  { name: "Mystery", tagId: "ee968100-4191-4968-93d3-f82d72be7e46" },
  { name: "Romance", tagId: "423e2eae-a7a2-4a8b-ac03-a8351462d71d" },
  { name: "Sci-Fi", tagId: "256c8bd9-4904-4360-bf4f-508a76d67183" },
  { name: "Slice of Life", tagId: "e5301a23-ebd9-49dd-a0cb-2add944c7fe9" },
  { name: "Sports", tagId: "69964a64-2f90-4d33-beeb-f3ed2875eb4c" },
  { name: "Thriller", tagId: "07251805-a27e-4d59-b488-f0bfbec15168" },
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

export function sortLabel(key: string | undefined): string {
  return SORTS.find((option) => option.key === key)?.label ?? SORTS[0].label;
}
