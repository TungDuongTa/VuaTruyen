"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPersonalListCache,
  setPersonalListCache,
  subscribePersonalListCache,
} from "@/lib/personal-list-cache";

type UsePersonalListOptions<T> = {
  /** Cache key; null disables fetch (e.g. signed out / session pending). */
  cacheKey: string | null;
  fetcher: () => Promise<T>;
  /** Skip background refetch when cache is newer than this (ms). Default 15s. */
  freshForMs?: number;
  enabled?: boolean;
};

type UsePersonalListResult<T> = {
  data: T | null;
  /** True only when there is no cached data and a fetch is in flight. */
  isLoading: boolean;
  error: string | null;
  refresh: (options?: { force?: boolean }) => Promise<void>;
};

/**
 * Stale-while-revalidate for personal lists.
 * Shows cached data immediately, refreshes in the background.
 */
export function usePersonalList<T>({
  cacheKey,
  fetcher,
  freshForMs = 15_000,
  enabled = true,
}: UsePersonalListOptions<T>): UsePersonalListResult<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(() => {
    if (!cacheKey) return null;
    return getPersonalListCache<T>(cacheKey)?.data ?? null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled || !cacheKey) return false;
    return !getPersonalListCache<T>(cacheKey);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cached = getPersonalListCache<T>(cacheKey);
    setData(cached?.data ?? null);
    setIsLoading(!cached);

    return subscribePersonalListCache(cacheKey, () => {
      const next = getPersonalListCache<T>(cacheKey);
      // Keep showing previous data while invalidated/refetching (no empty flash).
      if (next) setData(next.data);
    });
  }, [cacheKey]);

  const refresh = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled || !cacheKey) return;

      const cached = getPersonalListCache<T>(cacheKey);
      const isFresh =
        !options?.force &&
        cached &&
        Date.now() - cached.updatedAt < freshForMs;

      if (isFresh) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }

      if (!cached) setIsLoading(true);

      try {
        const next = await fetcherRef.current();
        setPersonalListCache(cacheKey, next);
        setData(next);
        setError(null);
      } catch (err) {
        console.error("Failed to load personal list:", err);
        setError("Không thể tải danh sách. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    },
    [cacheKey, enabled, freshForMs],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
