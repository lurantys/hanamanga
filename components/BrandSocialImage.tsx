export function BrandSocialImage({ readerImage }: { readerImage: string }) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#09090b",
        color: "#fafafa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: 5,
          height: "100%",
          background: "#dc2626",
        }}
      />

      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 82,
          top: 64,
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 46,
            height: 46,
            borderRadius: 23,
            border: "3px solid #dc2626",
            color: "white",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          英
        </div>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
          Hana
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 86,
          top: 218,
          width: 590,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#f87171",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          MANGA · MANHWA · MANHUA · WEBTOONS
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 24,
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -2,
          }}
        >
          <span>Manga, made simple.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 590,
            color: "#a1a1aa",
            fontSize: 25,
            lineHeight: 1.4,
          }}
        >
          Discover new series, track your library, and pick up where you left off.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 86,
          bottom: 56,
          width: 1028,
          height: 1,
          background: "#27272a",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 86,
          bottom: 27,
          color: "#71717a",
          fontSize: 15,
          letterSpacing: 2,
        }}
      >
        DISCOVER · READ · TRACK
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={readerImage}
        width={450}
        height={450}
        alt=""
        style={{
          position: "absolute",
          right: 38,
          top: 104,
          width: 450,
          height: 450,
          objectFit: "contain",
        }}
      />
    </div>
  );
}
