"use server";

import { revalidatePath } from "next/cache";
import { BookmarkModel } from "@/database/models/bookmark.model";
import { connectToDatabase } from "@/database/mongoose";
import { normalizePageAndSize } from "@/lib/pagination";
import { getMangaCardsBySlugs } from "@/lib/services/manga.service";
import { getCurrentUserId } from "@/lib/server-session";
import type { OTruyenComic } from "@/types/otruyen-types";

type ToggleBookmarkInput = {
  slug: string;
  comicId?: string;
};

type BookmarkActionResult = {
  success: boolean;
  message: string;
  bookmarked: boolean;
  requiresSignIn?: boolean;
};

export type BookmarkedComic = OTruyenComic & {
  bookmarkedAt: string;
};

export type PaginatedBookmarksResult = {
  items: BookmarkedComic[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const DEFAULT_BOOKMARKS_PAGE_SIZE = 24;
const MAX_BOOKMARKS_PAGE_SIZE = 60;

const toTimeMs = (value: unknown): number => {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? time : 0;
};

const toBookmarkedComic = (
  manga: OTruyenComic | undefined,
  bookmark: { slug: string; createdAt?: Date | string },
): BookmarkedComic => {
  const bookmarkedAt = new Date(
    bookmark.createdAt || Date.now(),
  ).toISOString();

  if (manga) {
    return {
      ...manga,
      bookmarkedAt,
    };
  }

  return {
    _id: bookmark.slug,
    name: bookmark.slug,
    slug: bookmark.slug,
    origin_name: [],
    status: "ongoing",
    thumb_url: "",
    category: [],
    updatedAt: bookmarkedAt,
    chaptersLatest: [],
    bookmarkedAt,
  };
};

const normalizeBookmarksPagination = (page: number, pageSize: number) => ({
  ...normalizePageAndSize(
    page,
    pageSize,
    DEFAULT_BOOKMARKS_PAGE_SIZE,
    MAX_BOOKMARKS_PAGE_SIZE,
  ),
});

export const getCurrentUserBookmarksCount = async (): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  await connectToDatabase();
  return BookmarkModel.countDocuments({ userId });
};

export const getCurrentUserBookmarksPage = async ({
  page = 1,
  pageSize = DEFAULT_BOOKMARKS_PAGE_SIZE,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedBookmarksResult> => {
  const userId = await getCurrentUserId();
  const normalized = normalizeBookmarksPagination(page, pageSize);

  if (!userId) {
    return {
      items: [],
      page: normalized.page,
      pageSize: normalized.pageSize,
      totalItems: 0,
      totalPages: 1,
    };
  }

  await connectToDatabase();

  const bookmarks = await BookmarkModel.find({ userId })
    .select("slug createdAt")
    .lean();

  const totalItems = bookmarks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalized.pageSize));
  const safePage = Math.min(normalized.page, totalPages);
  const mangaBySlug = await getMangaCardsBySlugs(
    bookmarks.map((bookmark) => String(bookmark.slug || "")),
  );

  const sortedBookmarks = bookmarks
    .map((bookmark) => {
      const slug = String(bookmark.slug || "").trim();
      const manga = mangaBySlug.get(slug);
      return {
        bookmark,
        slug,
        manga,
        sortUpdatedAt: manga?.updatedAt || bookmark.createdAt,
      };
    })
    .sort((a, b) => {
      const updatedDiff = toTimeMs(b.sortUpdatedAt) - toTimeMs(a.sortUpdatedAt);
      if (updatedDiff !== 0) return updatedDiff;

      return toTimeMs(b.bookmark.createdAt) - toTimeMs(a.bookmark.createdAt);
    });

  const skip = (safePage - 1) * normalized.pageSize;
  const items = sortedBookmarks
    .slice(skip, skip + normalized.pageSize)
    .map(({ bookmark, manga }) => toBookmarkedComic(manga, bookmark));

  return {
    items,
    page: safePage,
    pageSize: normalized.pageSize,
    totalItems,
    totalPages,
  };
};

export const isMangaBookmarked = async (slug: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return false;
  }

  await connectToDatabase();
  const existing = await BookmarkModel.findOne({ userId, slug }).select("_id");
  return Boolean(existing);
};

export const toggleMangaBookmark = async (
  input: ToggleBookmarkInput,
): Promise<BookmarkActionResult> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      success: false,
      message: "Vui lòng đăng nhập để đánh dấu truyện tranh.",
      bookmarked: false,
      requiresSignIn: true,
    };
  }

  const slug = String(input.slug || "").trim();
  if (!slug) {
    return {
      success: false,
      message: "Could not update bookmark right now. Please try again.",
      bookmarked: false,
    };
  }

  await connectToDatabase();

  const existing = await BookmarkModel.findOne({
    userId,
    slug,
  }).select("_id");

  if (existing) {
    await BookmarkModel.deleteOne({ _id: existing._id });
    revalidatePath("/bookmarks");
    revalidatePath(`/manga/${slug}`);
    revalidatePath(`/18+/${slug}`);

    return {
      success: true,
      message: "Đã xóa khỏi danh sách theo dõi",
      bookmarked: false,
    };
  }

  try {
    await BookmarkModel.create({
      userId,
      slug,
      comicId: input.comicId || slug,
    });

    revalidatePath("/bookmarks");
    revalidatePath(`/manga/${slug}`);
    revalidatePath(`/18+/${slug}`);

    return {
      success: true,
      message: "Đã thêm vào danh sách theo dõi",
      bookmarked: true,
    };
  } catch (error: any) {
    if (error?.code === 11000) {
      return {
        success: true,
        message: "Already in bookmarks.",
        bookmarked: true,
      };
    }

    console.error("Failed to toggle bookmark:", error);
    return {
      success: false,
      message: "Could not update bookmark right now. Please try again.",
      bookmarked: false,
    };
  }
};

export const removeMangaBookmark = async (slug: string): Promise<void> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return;
  }

  await connectToDatabase();
  await BookmarkModel.deleteOne({ userId, slug });
  revalidatePath("/bookmarks");
  revalidatePath(`/manga/${slug}`);
  revalidatePath(`/18+/${slug}`);
};
