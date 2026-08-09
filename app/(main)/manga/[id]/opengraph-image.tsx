import { unstable_cache } from "next/cache";
import { ImageResponse } from "next/og";
import { statusLabel, truncate } from "@/lib/mangadex";
import { fetchCatalogManga } from "@/lib/catalog";

export const alt = "Manga page on Hana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OgMangaCard = {
  title: string;
  description: string;
  subtitle: string;
  cover: string | null;
};

const cachedMangaCard = unstable_cache(
  async (id: string): Promise<OgMangaCard> => {
    const manga = await fetchCatalogManga(id, { withStats: false });
    let cover: string | null = null;
    const coverUrl = manga.coverUrl;
    if (coverUrl && !/\.avif$/i.test(coverUrl)) {
      const res = await fetch(coverUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const mime = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
        if (!mime.includes("avif")) {
          const bytes = Buffer.from(await res.arrayBuffer());
          cover = `data:${mime};base64,${bytes.toString("base64")}`;
        }
      }
    }
    const genres = manga.genres.slice(0, 3);
    const status = statusLabel(manga.status);
    const subtitle = [status, ...genres].filter(Boolean).join(" · ");
    return {
      title: manga.title,
      description: manga.description ? truncate(manga.description, 200) : "",
      subtitle,
      cover,
    };
  },
  ["og-manga-card"],
  { revalidate: 300 },
);

function titleSize(title: string): number {
  if (title.length > 42) return 42;
  if (title.length > 26) return 50;
  return 58;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const card = await cachedMangaCard(id);
    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundColor: "#09090b",
            overflow: "hidden",
          }}
        >
          {card.cover ? (
            <img
              src={card.cover}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.32,
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(9,9,11,0.55)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 56,
              width: "100%",
              height: "100%",
              padding: "64px 88px",
            }}
          >
            {card.cover ? (
              <img
                src={card.cover}
                alt=""
                style={{
                  width: 280,
                  height: 420,
                  objectFit: "cover",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
                }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "flex-start",
                gap: 18,
                maxWidth: 560,
              }}
            >
              <div
                style={{
                  color: "#ef4444",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                }}
              >
                Hana
              </div>
              <div
                style={{
                  color: "#fafafa",
                  fontSize: titleSize(card.title),
                  fontWeight: 800,
                  lineHeight: 1.08,
                  maxWidth: 560,
                }}
              >
                {card.title}
              </div>
              {card.subtitle ? (
                <div
                  style={{
                    color: "#a1a1aa",
                    fontSize: 26,
                    fontWeight: 500,
                    maxWidth: 560,
                  }}
                >
                  {card.subtitle}
                </div>
              ) : null}
              {card.description ? (
                <div
                  style={{
                    color: "#d4d4d8",
                    fontSize: 22,
                    fontWeight: 400,
                    lineHeight: 1.5,
                    maxWidth: 560,
                    maxHeight: 66,
                    overflow: "hidden",
                  }}
                >
                  {card.description}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            backgroundColor: "#09090b",
          }}
        >
          <div
            style={{
              color: "#ef4444",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
            }}
          >
            Hana
          </div>
          <div
            style={{
              color: "#52525b",
              fontSize: 24,
              fontWeight: 500,
            }}
          >
            This manga could not be loaded
          </div>
        </div>
      ),
      { ...size },
    );
  }
}
