import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SearchResults } from "@/components/SearchResults";
import { SearchField } from "@/components/SearchField";
import { EmptyState } from "@/components/EmptyState";
import { ctaPrimary } from "@/lib/ui";
import { searchCatalog, searchCatalogByAuthor } from "@/lib/catalog";
import type { Manga } from "@/lib/mangadex";

export const metadata: Metadata = {
  title: "Search — Hana",
};

const POOL = 60;
const FIRST_PAGE = 24;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawAuthor = Array.isArray(params.author)
    ? params.author[0]
    : params.author;
  const query = rawQuery?.trim() ?? "";
  const author = rawAuthor?.trim() ?? "";

  if (!query && !author) {
    return (
      <main className="bg-zinc-950 pb-24">
        <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
          <div className="mb-8 lg:hidden">
            <SearchField />
          </div>
          <EmptyState
            art={
              <Image
                src="/conansearch.png"
                alt="Detective Conan on the case, searching the catalog"
                width={498}
                height={501}
                className="h-44 w-auto object-contain"
              />
            }
            title="Search the catalog"
            description="Type a title to discover manga from the Hana catalog."
            action={
              <Link href="/" className={`${ctaPrimary} mt-2`}>
                Back to Catalog
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  let initialData: Manga[] = [];
  let total = 0;
  let errored = false;
  let authorName: string | undefined;
  let authorImageUrl: string | null | undefined;
  // Author search is AniList-only; when AniList is unreachable we silently
  // fall back to a plain title search with the same terms.
  let fellBackToTitle = false;
  try {
    if (author) {
      const pool = await searchCatalogByAuthor(author, POOL);
      initialData = pool.data.slice(0, FIRST_PAGE);
      total = pool.data.length;
      authorName = pool.authorName;
      authorImageUrl = pool.authorImageUrl;
    }
  } catch {
    fellBackToTitle = true;
  }
  if (!author || fellBackToTitle) {
    try {
      const pool = await searchCatalog(fellBackToTitle ? author : query, POOL);
      initialData = pool.data.slice(0, FIRST_PAGE);
      total = pool.data.length;
    } catch {
      errored = true;
    }
  }

  return (
    <main className="bg-zinc-950 pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-header md:px-10">
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          Search Results
        </h1>
        <div className="mb-6 mt-4 lg:hidden">
          <SearchField initialQuery={query} />
        </div>
        <SearchResults
          key={fellBackToTitle ? `title:${author}` : author ? `author:${author}` : query}
          query={fellBackToTitle ? author : query}
          author={fellBackToTitle ? undefined : author || undefined}
          authorName={authorName}
          authorImageUrl={authorImageUrl}
          initialData={initialData}
          total={total}
          errored={errored}
        />
      </div>
    </main>
  );
}
