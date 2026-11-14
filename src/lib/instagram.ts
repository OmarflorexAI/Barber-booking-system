/**
 * An Instagram handle as people type it: "@fresh.cuts" or "fresh.cuts" gives "fresh.cuts";
 * null or blank gives null (cleared); a URL, spaces or more than 30 characters give "invalid".
 * Pure (no server imports), so client forms can use it for inline checks.
 */
export function normalizeInstagram(input: string | null | undefined): string | null | "invalid" {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const handle = raw.startsWith("@") ? raw.slice(1) : raw;
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : "invalid";
}
