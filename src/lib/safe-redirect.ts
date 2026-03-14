const ALLOWED_PREFIXES = ['/quote/'];

export function isSafeRedirect(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  return ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function getSafeRedirect(url: string | null | undefined, fallback: string): string {
  return isSafeRedirect(url) ? url! : fallback;
}
