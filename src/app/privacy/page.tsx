import { LegalPage, legalMetadata } from "../_legal/legal-page";

export const metadata = legalMetadata("privacy", "en");

export default function PrivacyEnPage() {
  return <LegalPage page="privacy" locale="en" />;
}
