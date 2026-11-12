import { Landing, landingMetadata } from "../_landing/landing";

export const metadata = landingMetadata("es");

/** The Spanish landing page (the same page as /, in Spanish). */
export default function HomeEs() {
  return <Landing locale="es" />;
}
