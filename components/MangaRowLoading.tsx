import { MangaCardSkeleton } from "./MangaCardSkeleton";

export function MangaRowLoading({ title }: { title: string }) {
  return (
    <section aria-label={`Loading ${title}`} aria-busy="true">
      <h2 className="mb-3 px-5 text-lg font-bold tracking-tight text-zinc-100 md:px-10">
        {title}
      </h2>
      <div className="flex gap-4 overflow-hidden px-5 py-2 md:px-10 md:py-9">
        {Array.from({ length: 8 }, (_, index) => (
          <MangaCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
