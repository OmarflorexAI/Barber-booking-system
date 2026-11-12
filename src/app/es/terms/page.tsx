import { LegalPage, legalMetadata } from "../../_legal/legal-page";

export const metadata = legalMetadata("terms", "es");

export default function TermsEsPage() {
  return <LegalPage page="terms" locale="es" />;
}
