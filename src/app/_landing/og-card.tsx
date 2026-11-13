import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

/* Hanken Grotesk, the product's one family (static TTFs: ImageResponse can't read woff2).
   Read once per process; the cards are prerendered at build time. */
const fontDir = join(process.cwd(), "src/app/_landing/fonts");
const fonts = Promise.all([
  readFile(join(fontDir, "HankenGrotesk-Regular.ttf")),
  readFile(join(fontDir, "HankenGrotesk-SemiBold.ttf")),
]);

/** The shared-link card for opengraph-image.tsx (/) and es/opengraph-image.tsx (/es). */
export async function ogCard(tagline: string) {
  const [regular, semibold] = await fonts;
  const ink = "#ededed";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#000",
          color: ink,
          fontFamily: "Hanken Grotesk",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <circle cx="9.3" cy="23.4" r="4.5" stroke={ink} strokeWidth="1.25" />
          <circle cx="22.7" cy="23.4" r="4.5" stroke={ink} strokeWidth="1.25" />
          <path d="M12.1 19.8 L26.2 3.2 L14.1 20.9 Z" fill={ink} />
          <path d="M19.9 19.8 L5.8 3.2 L17.9 20.9 Z" fill={ink} />
          <circle cx="16" cy="15.9" r="1.35" fill="#e6443d" stroke="#000" strokeWidth="0.6" />
        </svg>
        <div style={{ marginTop: 48, fontSize: 96, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }}>Barber Master</div>
        <div style={{ marginTop: 28, fontSize: 38, color: "#a3a3a3", lineHeight: 1.3, maxWidth: 900 }}>{tagline}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Hanken Grotesk", data: regular, style: "normal", weight: 400 },
        { name: "Hanken Grotesk", data: semibold, style: "normal", weight: 600 },
      ],
    },
  );
}
