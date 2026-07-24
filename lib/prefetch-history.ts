const STORAGE_KEY = "vt:history-prefetch-at";

/** Avoid repeat prefetches while browsing (e.g. after login). */
const DEFAULT_MIN_INTERVAL_MS = 60_000;

/** After a new chapter read, allow a refresh sooner — still debounce binge flips. */
const FORCE_MIN_INTERVAL_MS = 15_000;

type PrefetchFn = (href: string) => void;

/**
 * Fire-and-forget warm-up for /history. Never await in the UI path.
 * Debounced via sessionStorage so login + chapter binge don't spam the server.
 */
export function prefetchHistoryRoute(
  prefetch: PrefetchFn,
  options?: { force?: boolean },
): void {
  const minInterval = options?.force
    ? FORCE_MIN_INTERVAL_MS
    : DEFAULT_MIN_INTERVAL_MS;

  try {
    const lastAt = Number(sessionStorage.getItem(STORAGE_KEY) || "0");
    if (
      Number.isFinite(lastAt) &&
      lastAt > 0 &&
      Date.now() - lastAt < minInterval
    ) {
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // sessionStorage may be blocked; still attempt prefetch once.
  }

  try {
    prefetch("/history");
  } catch (error) {
    console.error("Failed to prefetch /history:", error);
  }
}
