"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleMangaBookmark } from "@/lib/actions/bookmark.actions";
import type { Category } from "@/types/otruyen-types";

type UseBookmarkToggleInput = {
  initialBookmarked: boolean;
  comicId: string;
  slug: string;
  name: string;
  thumbUrl: string;
  status: string;
  comicUpdatedAt: string;
  categories: Category[];
  latestChapterName?: string;
  routeBase?: string;
  signInPath?: string;
};

export const useBookmarkToggle = ({
  initialBookmarked,
  comicId,
  slug,
  name,
  thumbUrl,
  status,
  comicUpdatedAt,
  categories,
  latestChapterName,
  routeBase = "/manga",
  signInPath = "/sign-in",
}: UseBookmarkToggleInput) => {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  useEffect(() => {
    setIsBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  const handleBookmarkToggle = useCallback(async () => {
    if (isBookmarkLoading) return;

    setIsBookmarkLoading(true);
    try {
      const result = await toggleMangaBookmark({
        comicId,
        slug,
        routeBase: routeBase === "/18+" ? "/18+" : "/manga",
        name,
        thumbUrl,
        status,
        comicUpdatedAt,
        categories: categories || [],
        latestChapterName,
      });

      if (!result.success) {
        toast.error(result.message);
        if (result.requiresSignIn) {
          router.push(signInPath);
        }
        return;
      }

      setIsBookmarked(result.bookmarked);
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to bookmark manga:", error);
      toast.error("Could not update bookmark. Please try again.");
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [
    isBookmarkLoading,
    comicId,
    slug,
    routeBase,
    name,
    thumbUrl,
    status,
    comicUpdatedAt,
    categories,
    latestChapterName,
    router,
    signInPath,
  ]);

  return {
    isBookmarked,
    isBookmarkLoading,
    handleBookmarkToggle,
  };
};
