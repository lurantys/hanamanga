function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-800/80 ${className}`} />;
}

export function MangaRowLoading({ title }: { title: string }) {
  return (
    <section aria-label={`Loading ${title}`}>
      <h2 className="mb-3 px-5 text-lg font-bold tracking-tight text-zinc-100 md:px-10">
        {title}
      </h2>
      <div className="flex gap-4 overflow-hidden px-5 py-2 md:px-10 md:py-9">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="w-36 shrink-0 md:w-44">
            <Block className="aspect-[2/3] rounded-lg" />
            <Block className="mt-2 h-4 w-4/5" />
            <Block className="mt-1 h-3 w-2/5 bg-zinc-900" />
          </div>
        ))}
      </div>
    </section>
  );
}
