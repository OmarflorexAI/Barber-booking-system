import { Landing, landingMetadata } from "./_landing/landing";

export const metadata = landingMetadata;

/** The landing page (English only; browsers offer Spanish speakers a translation). */
export default function Home() {
  return <Landing />;
}
