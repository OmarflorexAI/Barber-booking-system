import { Landing, landingMetadata } from "./_landing/landing";

export const metadata = landingMetadata("en");

/** The English landing page. Spanish visitors are sent to /es by src/proxy.ts. */
export default function Home() {
  return <Landing locale="en" />;
}
