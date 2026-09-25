export function RouteSkeleton({ kind = "page" }: { kind?: "page" | "reader" }) {
  if (kind === "reader") {
    return (
      <main aria-label="Loading chapter" className="min-h-[70vh] bg-zinc-950 px-4 py-6">
        <div className="mx-auto h-[70vh] max-w-3xl animate-pulse rounded-lg bg-zinc-900" />
      </main>
    );
  }
  return (
    <main aria-label="Loading page" className="min-h-[70vh] bg-zinc-950 px-5 py-8 md:px-10">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-56 rounded bg-zinc-800" />
        <div className="h-4 w-80 max-w-full rounded bg-zinc-900" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="aspect-[2/3] rounded-lg bg-zinc-900" />
          ))}
        </div>
      </div>
    </main>
  );
}
