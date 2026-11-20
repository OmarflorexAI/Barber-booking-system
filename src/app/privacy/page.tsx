import { LegalPage, legalMetadata } from "../_legal/legal-page";

export const metadata = legalMetadata("privacy");

export default function PrivacyEnPage() {
  return <LegalPage page="privacy" />;
}
