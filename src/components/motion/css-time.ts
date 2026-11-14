/**
 * A motion token (`--dur-fast` / `--dur-base` / `--dur-slow`) in milliseconds, for Web
 * Animations calls. Read the unit: the CSS build minifies "420ms" to ".42s", and a bare
 * parseFloat would turn that into 0.42 ms (the animation would end at once).
 */
export function cssDurationMs(name: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return /ms$/i.test(raw) ? n : /s$/i.test(raw) ? n * 1000 : n;
}
