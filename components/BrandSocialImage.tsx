export function BrandSocialImage() {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        alignItems: "center",
        background:
          "linear-gradient(125deg, #09090b 0%, #111113 55%, #1b1012 100%)",
        color: "#fafafa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: 600,
          height: 600,
          right: -120,
          top: 80,
          borderRadius: 300,
          border: "1px solid rgba(239, 68, 68, 0.16)",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: 420,
          height: 420,
          right: -28,
          top: 170,
          borderRadius: 210,
          border: "1px solid rgba(239, 68, 68, 0.2)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          marginLeft: 86,
          width: 760,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 58,
              height: 58,
              borderRadius: 29,
              border: "4px solid #dc2626",
              color: "white",
              fontSize: 30,
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
            marginTop: 54,
            color: "#fca5a5",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          YOUR NEXT FAVORITE STORY
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          Read beyond the page.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            color: "#a1a1aa",
            fontSize: 24,
          }}
        >
          Manga, manhwa, manhua, and webtoons — all in one place.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 38,
            color: "#71717a",
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          HANAMANGA.ONLINE
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
          width: 230,
          height: 230,
          right: 90,
          top: 200,
          borderRadius: 115,
          border: "3px solid rgba(220, 38, 38, 0.75)",
          color: "#f4f4f5",
          fontSize: 120,
          fontWeight: 700,
          boxShadow: "0 0 80px rgba(220, 38, 38, 0.14)",
        }}
      >
        英
      </div>
    </div>
  );
}
