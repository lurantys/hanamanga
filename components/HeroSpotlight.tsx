import { getTrending, pickHero } from "@/lib/read";
import { enhanceWithAniList } from "@/lib/catalog";
import { HERO_FALLBACK_GRADIENT } from "@/lib/ui";
import { HeroSpotlightClient } from "./HeroSpotlightClient";

function HeroFallback() {
  return (
      <section className="relative flex min-h-[calc(93vw+27.5rem+env(safe-area-inset-top))] w-full items-center justify-center overflow-hidden bg-zinc-950 md:h-[70dvh] md:min-h-[420px]">
      <div
        className="absolute inset-0"
        style={{
          background: HERO_FALLBACK_GRADIENT,
        }}
      />
      <p className="relative px-6 text-center text-sm text-zinc-500">
        New manga is on the way — try again in a moment.
      </p>
    </section>
  );
}

export async function HeroSpotlight() {
  let data;
  try {
    data = await getTrending();
  } catch {
    data = null;
  }
  const picked = data ? pickHero(data.data) : null;
  if (!picked) return <HeroFallback />;
  const hero = await enhanceWithAniList(picked).catch(() => picked);
  return <HeroSpotlightClient initial={hero} />;
}
