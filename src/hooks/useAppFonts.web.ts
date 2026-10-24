/**
 * Web: fonts are declared in public/index.html with font-display: swap and
 * a system fallback, so rendering never waits for them.
 */
export function useAppFonts(): boolean {
  return true;
}
