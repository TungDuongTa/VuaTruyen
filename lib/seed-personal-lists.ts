"use client";

import {
  bookmarksListCacheKey,
  historyListCacheKey,
  rememberPersonalListUserId,
  setPersonalListCache,
} from "@/lib/personal-list-cache";
import { getMyBookmarksPage } from "@/lib/actions/bookmark.actions";
import { getMyReadingHistoryPage } from "@/lib/actions/reading-progress.actions";

const ITEMS_PER_PAGE = 24;

let seedInFlightForUser: string | null = null;

/**
 * Warm page-1 caches after login so /history and /bookmarks open from memory.
 * Fire-and-forget; safe to call repeatedly (deduped per user).
 */
export function seedPersonalListCaches(userId: string): void {
  if (!userId || seedInFlightForUser === userId) return;
  seedInFlightForUser = userId;

  void (async () => {
    try {
      const [history, bookmarks] = await Promise.all([
        getMyReadingHistoryPage(1, ITEMS_PER_PAGE),
        getMyBookmarksPage(1, ITEMS_PER_PAGE),
      ]);

      if (!history.requiresSignIn) {
        setPersonalListCache(historyListCacheKey(userId, history.page), history);
      }
      if (!bookmarks.requiresSignIn) {
        setPersonalListCache(
          bookmarksListCacheKey(userId, bookmarks.page),
          bookmarks,
        );
      }
      rememberPersonalListUserId(userId);
    } catch (error) {
      console.error("Failed to seed personal list caches:", error);
    } finally {
      if (seedInFlightForUser === userId) seedInFlightForUser = null;
    }
  })();
}

/** After a chapter is saved, refresh history page-1 cache in the background. */
export function reseedHistoryListCache(userId: string): void {
  if (!userId) return;

  void (async () => {
    try {
      const history = await getMyReadingHistoryPage(1, ITEMS_PER_PAGE);
      if (history.requiresSignIn) return;
      setPersonalListCache(historyListCacheKey(userId, history.page), history);
      rememberPersonalListUserId(userId);
    } catch (error) {
      console.error("Failed to reseed history cache:", error);
    }
  })();
}
