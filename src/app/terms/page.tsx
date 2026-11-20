import { LegalPage, legalMetadata } from "../_legal/legal-page";

export const metadata = legalMetadata("terms");

export default function TermsEnPage() {
  return <LegalPage page="terms" />;
}
