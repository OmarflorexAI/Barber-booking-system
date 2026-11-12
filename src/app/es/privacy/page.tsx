import { LegalPage, legalMetadata } from "../../_legal/legal-page";

export const metadata = legalMetadata("privacy", "es");

export default function PrivacyEsPage() {
  return <LegalPage page="privacy" locale="es" />;
}
