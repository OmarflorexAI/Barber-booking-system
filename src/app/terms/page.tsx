import { LegalPage, legalMetadata } from "../_legal/legal-page";

export const metadata = legalMetadata("terms", "en");

export default function TermsEnPage() {
  return <LegalPage page="terms" locale="en" />;
}
