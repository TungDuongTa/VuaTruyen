"use client";

import { useEffect, useState } from "react";
import { isMangaBookmarked } from "@/lib/actions/bookmark.actions";
import { getReadingProgressChapterNames } from "@/lib/actions/reading-progress.actions";

/**
 * Loads per-user bookmark + reading progress on the client so manga/chapter
 * pages can stay statically cacheable (ISR) without calling headers()/session
 * during the server render.
 */
export function useMangaPersonalState(slug: string) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readChapterNames, setReadChapterNames] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const normalizedSlug = String(slug || "").trim();
    if (!normalizedSlug) {
      setIsReady(true);
      return;
    }

    let cancelled = false;
    setIsReady(false);

    Promise.all([
      isMangaBookmarked(normalizedSlug),
      getReadingProgressChapterNames(normalizedSlug),
    ])
      .then(([bookmarked, chapters]) => {
        if (cancelled) return;
        setIsBookmarked(Boolean(bookmarked));
        setReadChapterNames(Array.isArray(chapters) ? chapters : []);
        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsBookmarked(false);
        setReadChapterNames([]);
        setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return {
    isBookmarked,
    setIsBookmarked,
    readChapterNames,
    setReadChapterNames,
    isReady,
  };
}
