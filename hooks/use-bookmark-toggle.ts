"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleMangaBookmark } from "@/lib/actions/bookmark.actions";

type UseBookmarkToggleInput = {
  initialBookmarked: boolean;
  slug: string;
  comicId?: string;
  signInPath?: string;
};

export const useBookmarkToggle = ({
  initialBookmarked,
  slug,
  comicId,
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
        slug,
        comicId,
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
  }, [isBookmarkLoading, slug, comicId, router, signInPath]);

  return {
    isBookmarked,
    isBookmarkLoading,
    handleBookmarkToggle,
  };
};
