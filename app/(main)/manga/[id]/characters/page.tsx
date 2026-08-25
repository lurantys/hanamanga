import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorPage } from "@/components/ErrorPage";
import {
  fetchAniListCharacters,
  isAniListDownError,
  type AniListCharacter,
} from "@/lib/anilist";
import { fetchCatalogMangaWithFallback, isNotFoundError } from "@/lib/catalog";
import { parseMangaId } from "@/lib/source";

type CharactersPageProps = {
  params: Promise<{ id: string }>;
};

function characterRoleLabel(role?: string): string | null {
  switch (role) {
    case "MAIN":
      return "Main";
    case "SUPPORTING":
      return "Supporting";
    case "BACKGROUND":
      return "Background";
    default:
      return null;
  }
}

export async function generateMetadata({
  params,
}: CharactersPageProps): Promise<Metadata> {
  const { id } = await params;
  let title = "Characters";
  try {
    const manga = await fetchCatalogMangaWithFallback(id);
    title = `${manga.title} — Characters`;
  } catch {
    // fall back to generic title below
  }
  return { title: `${title} — Hana` };
}

async function resolveAniListId(id: string): Promise<string | null> {
  const { source, ref } = parseMangaId(id);
  if (source === "al") return ref;
  try {
    const manga = await fetchCatalogMangaWithFallback(id);
    return manga.links?.al ?? null;
  } catch (error) {
    if (isNotFoundError(error)) notFound();
    return null;
  }
}

function CharacterCard({ character }: { character: AniListCharacter }) {
  const role = characterRoleLabel(character.role);
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="relative aspect-[3/4] w-full bg-zinc-900">
        {character.imageUrl ? (
          <Image
            src={character.imageUrl}
            alt={character.name}
            fill
            sizes="(min-width: 1024px) 180px, (min-width: 768px) 160px, 45vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-white">
          {character.name}
        </p>
        {role && <p className="text-xs text-zinc-500">{role}</p>}
        {character.voiceActor && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
            {character.voiceActor.imageUrl ? (
              <Image
                src={character.voiceActor.imageUrl}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate">{character.voiceActor.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default async function CharactersPage({
  params,
}: CharactersPageProps) {
  const { id } = await params;
  const rawId = decodeURIComponent(id);
  const alId = await resolveAniListId(rawId);

  let mangaTitle = "this title";
  try {
    const manga = await fetchCatalogMangaWithFallback(rawId);
    mangaTitle = manga.title;
  } catch {
    // keep default
  }

  if (!alId) {
    return (
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-40 md:px-10 md:pt-36">
        <Link
          href={`/manga/${rawId}`}
          className="text-sm text-zinc-400 transition-colors hover:text-white"
        >
          ← Back to {mangaTitle}
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-white">Characters</h1>
        <p className="mt-3 text-sm text-zinc-400">
          Character data isn&apos;t available for this title.
        </p>
      </main>
    );
  }

  let characters: AniListCharacter[] = [];
  let anilistDown = false;
  try {
    characters = await fetchAniListCharacters(alId);
  } catch (error) {
    anilistDown = isAniListDownError(error);
  }

  if (anilistDown) {
    return (
      <ErrorPage
        eyebrow="Error"
        title="AniList is down"
        description="Character data comes from AniList, which has been temporarily disabled due to severe stability issues. Please try again in a little while."
        className="pb-24 pt-40 md:pt-32"
      >
        <Link
          href={`/manga/${rawId}`}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/40 hover:text-white"
        >
          ← Back to {mangaTitle}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/80"
        >
          Back to Home
        </Link>
      </ErrorPage>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-40 md:px-10 md:pt-36">
      <Link
        href={`/manga/${rawId}`}
        className="text-sm text-zinc-400 transition-colors hover:text-white"
      >
        ← Back to {mangaTitle}
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-white">Characters</h1>

      {characters.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">
          No characters listed for this title.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      )}
    </main>
  );
}
