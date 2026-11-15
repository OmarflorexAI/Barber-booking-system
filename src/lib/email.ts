/**
 * An email as people type it: trimmed and lowercased; null or blank gives null (cleared);
 * anything that isn't name@domain.tld (or is over 254 characters) gives "invalid". The same
 * light check as the `barbers.email` constraint. Pure, so client forms can use it too.
 */
export function normalizeEmail(input: string | null | undefined): string | null | "invalid" {
  const raw = (input ?? "").trim().toLowerCase();
  if (!raw) return null;
  return raw.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw) ? raw : "invalid";
}
