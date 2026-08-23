import { getTrending, pickHero } from "@/lib/read";
import { enhanceWithAniList } from "@/lib/catalog";
import { HeroSpotlightClient } from "./HeroSpotlightClient";

function HeroFallback() {
  return (
      <section className="relative flex h-[65vh] min-h-[420px] w-full items-center justify-center overflow-hidden bg-zinc-950 md:h-[80dvh] md:min-h-[480px]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, #27272a 0%, #09090b 60%)",
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
  const hero = await enhanceWithAniList(picked);
  return <HeroSpotlightClient initial={hero} />;
}
