/**
 * Normalize a phone number to E.164. Pilot Shops are in New York, so a bare
 * 10-digit number is treated as US (+1). Returns null when it cannot be a real number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    if (digits.startsWith("1")) return isNanp(digits.slice(1)) ? `+${digits}` : null;
    return digits.length >= 8 && digits.length <= 15 && digits[0] !== "0" ? `+${digits}` : null;
  }
  if (digits.length === 10) return isNanp(digits) ? `+1${digits}` : null;
  if (digits.length === 11 && digits.startsWith("1")) return isNanp(digits.slice(1)) ? `+${digits}` : null;
  return null;
}

/** North American number: area code and exchange cannot start with 0 or 1. */
function isNanp(ten: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten);
}

/** "+17185551234" -> "(718) 555-1234" for display. */
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
