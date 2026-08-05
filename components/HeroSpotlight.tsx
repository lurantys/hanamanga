import { getTrending, pickHero } from "@/lib/read";
import { bannerForTitle } from "@/lib/banner";
import { HeroSpotlightClient } from "./HeroSpotlightClient";

function HeroFallback() {
  return (
    <section className="relative flex h-[80vh] min-h-[480px] w-full items-center justify-center overflow-hidden bg-zinc-950">
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
  const hero = data ? pickHero(data.data) : null;
  if (!hero) return <HeroFallback />;
  const bannerUrl = await bannerForTitle(hero.title);
  return <HeroSpotlightClient initial={hero} bannerUrl={bannerUrl} />;
}
