"use server";

import { revalidatePath } from "next/cache";
import { BookmarkModel } from "@/database/models/bookmark.model";
import { connectToDatabase } from "@/database/mongoose";
import { normalizePageAndSize } from "@/lib/pagination";
import { getCurrentUserId } from "@/lib/server/session";
import type { OTruyenComic } from "@/types/manga-types";

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

type BookmarkAggRow = {
  slug: string;
  createdAt?: Date;
  manga?: Record<string, unknown> | null;
};

const toBookmarkedComic = (
  manga: OTruyenComic | undefined,
  bookmark: { slug: string; createdAt?: Date | string },
): BookmarkedComic => {
  const bookmarkedAt = new Date(bookmark.createdAt || Date.now()).toISOString();

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

const mangaFromAgg = (
  _slug: string,
  mangaDoc: Record<string, unknown> | null | undefined,
): OTruyenComic | undefined => {
  if (!mangaDoc) return undefined;

  return {
    _id: String(mangaDoc._id),
    name: String(mangaDoc.name),
    slug: String(mangaDoc.slug),
    origin_name: Array.isArray(mangaDoc.originNames)
      ? (mangaDoc.originNames as string[])
      : [],
    status: String(mangaDoc.status || "ongoing"),
    thumb_url: String(mangaDoc.thumbUrl || ""),
    category: Array.isArray(mangaDoc.categories)
      ? (mangaDoc.categories as OTruyenComic["category"])
      : [],
    updatedAt: new Date(mangaDoc.updatedAt as Date | string).toISOString(),
    chaptersLatest: mangaDoc.latestChapterName
      ? [
          {
            filename: "",
            chapter_name: String(mangaDoc.latestChapterName),
            chapter_title: "",
            chapter_api_data: String(mangaDoc.latestChapterName),
          },
        ]
      : [],
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

const bookmarkListPipeline = (userId: string, skip: number, limit: number) => [
  { $match: { userId } },
  {
    $lookup: {
      from: "mangas",
      localField: "slug",
      foreignField: "slug",
      as: "manga",
    },
  },
  {
    $unwind: {
      path: "$manga",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $addFields: {
      sortDate: {
        $ifNull: ["$manga.updatedAt", "$createdAt"],
      },
    },
  },
  {
    $sort: { sortDate: -1 as const, createdAt: -1 as const, _id: -1 as const },
  },
  {
    $facet: {
      metadata: [{ $count: "total" }],
      items: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            slug: 1,
            createdAt: 1,
            manga: 1,
          },
        },
      ],
    },
  },
];

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

  const runFacet = async (skip: number) => {
    const [facet] = await BookmarkModel.aggregate<{
      metadata: Array<{ total: number }>;
      items: BookmarkAggRow[];
    }>(bookmarkListPipeline(userId, skip, normalized.pageSize));

    return {
      totalItems: facet?.metadata?.[0]?.total || 0,
      rows: facet?.items || [],
    };
  };

  let { totalItems, rows } = await runFacet(
    (normalized.page - 1) * normalized.pageSize,
  );
  const totalPages = Math.max(1, Math.ceil(totalItems / normalized.pageSize));
  const safePage = Math.min(normalized.page, totalPages);

  if (safePage !== normalized.page && totalItems > 0) {
    ({ rows } = await runFacet((safePage - 1) * normalized.pageSize));
  }

  const items = rows.map((row) => {
    const slug = String(row.slug || "").trim();
    return toBookmarkedComic(mangaFromAgg(slug, row.manga), {
      slug,
      createdAt: row.createdAt,
    });
  });

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
