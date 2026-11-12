import { ImageResponse } from "next/og";
import { landingDictionaries } from "@/lib/i18n/landing";

/* The shared-link card: black ground, the open-scissors mark, the name and the English tagline.
   Uses ImageResponse's bundled default font (Geist), so nothing is fetched. */
export const alt = "Barber Master";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <circle cx="9.3" cy="23.4" r="4.5" stroke={ink} strokeWidth="1.25" />
          <circle cx="22.7" cy="23.4" r="4.5" stroke={ink} strokeWidth="1.25" />
          <path d="M12.1 19.8 L26.2 3.2 L14.1 20.9 Z" fill={ink} />
          <path d="M19.9 19.8 L5.8 3.2 L17.9 20.9 Z" fill={ink} />
          <circle cx="16" cy="15.9" r="1.35" fill="#d0312d" stroke="#000" strokeWidth="0.6" />
        </svg>
        <div style={{ marginTop: 48, fontSize: 96, letterSpacing: "-0.03em", lineHeight: 1 }}>Barber Master</div>
        <div style={{ marginTop: 28, fontSize: 38, color: "#a3a3a3", lineHeight: 1.3, maxWidth: 900 }}>{landingDictionaries.en.footer}</div>
      </div>
    ),
    size,
  );
}
