"use server";

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/database/mongoose";
import { BookmarkModel } from "@/database/models/bookmark.model";
import { ReadingProgressModel } from "@/database/models/reading-progress.model";
import { trackMangaChapterView } from "@/lib/actions/manga-view.actions";
import { normalizePageAndSize } from "@/lib/pagination";
import {
  getUserReadingExpStats,
  incrementUserReadingStatsForNewChapter,
} from "@/lib/server/user-level";
import { getCurrentUserId } from "@/lib/server/session";
import type { ReadingExpStats } from "@/lib/user-level";
import type { OTruyenComic } from "@/types/manga-types";

type MarkChapterAsReadProgressInput = {
  comicId?: string;
  comicSlug: string;
  chapterName: string;
};

type MarkChapterAsReadProgressResult = {
  success: boolean;
  requiresSignIn?: boolean;
};

type RecordChapterVisitInput = {
  comicId?: string;
  comicSlug: string;
  comicName?: string;
  thumbUrl?: string;
  comicUpdatedAt?: string;
  chapterName: string;
  latestChapterName?: string;
};

type RecordChapterVisitResult = {
  success: boolean;
  progressUpdated: boolean;
};

export type ReadingHistoryComic = OTruyenComic & {
  latestReadAt: string;
  latestReadChapterName: string;
};

export type PaginatedReadingHistoryResult = {
  items: ReadingHistoryComic[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type ReadingProgressDoc = {
  _id?: unknown;
  userId?: string;
  comicId?: string;
  comicSlug?: string;
  readChapters?: string[];
  lastReadChapter?: string;
  lastReadAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type HistoryAggRow = ReadingProgressDoc & {
  manga?: Record<string, unknown> | null;
};

const DEFAULT_READING_HISTORY_PAGE_SIZE = 24;
const MAX_READING_HISTORY_PAGE_SIZE = 60;

const normalizeString = (value: unknown): string => String(value || "").trim();

const uniqueChapterNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((chapter) => normalizeString(chapter)).filter(Boolean)),
  );
};

const toIsoDateString = (
  ...values: Array<Date | string | null | undefined>
): string => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
};

const mangaFromAgg = (
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

const toReadingHistoryComic = (
  doc: HistoryAggRow,
): ReadingHistoryComic | null => {
  const comicSlug = String(doc.comicSlug || "");
  if (!comicSlug) return null;

  const readChapters = uniqueChapterNames(doc.readChapters);
  const latestReadChapterName =
    String(doc.lastReadChapter || "").trim() || readChapters[0] || "";
  const latestReadAt = toIsoDateString(
    doc.lastReadAt,
    doc.updatedAt,
    doc.createdAt,
  );
  const manga = mangaFromAgg(doc.manga);

  if (manga) {
    return {
      ...manga,
      latestReadAt,
      latestReadChapterName,
    };
  }

  return {
    _id: String(doc.comicId || comicSlug),
    name: comicSlug,
    slug: comicSlug,
    origin_name: [],
    status: "ongoing",
    thumb_url: "",
    category: [],
    updatedAt: latestReadAt,
    chaptersLatest: latestReadChapterName
      ? [
          {
            filename: "",
            chapter_name: latestReadChapterName,
            chapter_title: "",
            chapter_api_data: "",
          },
        ]
      : [],
    latestReadAt,
    latestReadChapterName,
  };
};

const normalizeHistoryPagination = (page: number, pageSize: number) => ({
  ...normalizePageAndSize(
    page,
    pageSize,
    DEFAULT_READING_HISTORY_PAGE_SIZE,
    MAX_READING_HISTORY_PAGE_SIZE,
  ),
});

/** Sort on progress index, then $lookup only the page slice. */
const historyListPipeline = (userId: string, skip: number, limit: number) => [
  {
    $match: {
      userId,
      readChapters: { $exists: true },
    },
  },
  { $sort: { lastReadAt: -1 as const, _id: -1 as const } },
  {
    $facet: {
      metadata: [{ $count: "total" }],
      items: [
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "mangas",
            localField: "comicSlug",
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
          $project: {
            comicId: 1,
            comicSlug: 1,
            readChapters: 1,
            lastReadChapter: 1,
            lastReadAt: 1,
            createdAt: 1,
            updatedAt: 1,
            manga: 1,
          },
        },
      ],
    },
  },
];

export const getCurrentUserReadingExpStats =
  async (): Promise<ReadingExpStats> => {
    const userId = await getCurrentUserId();
    return getUserReadingExpStats(userId);
  };

export type MangaPersonalState = {
  bookmarked: boolean;
  readChapterNames: string[];
};

const emptyPersonalState = (): MangaPersonalState => ({
  bookmarked: false,
  readChapterNames: [],
});

/** Bookmark + read chapters for the current user (one round-trip). */
export const getMangaPersonalState = async (
  comicSlug: string,
): Promise<MangaPersonalState> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return emptyPersonalState();

    const normalizedComicSlug = normalizeString(comicSlug);
    if (!normalizedComicSlug) return emptyPersonalState();

    await connectToDatabase();

    const [bookmarkDoc, progressDocRaw] = await Promise.all([
      BookmarkModel.findOne({
        userId,
        slug: normalizedComicSlug,
      })
        .select("_id")
        .lean(),
      ReadingProgressModel.findOne({
        userId,
        comicSlug: normalizedComicSlug,
        readChapters: { $exists: true },
      })
        .select("readChapters lastReadChapter -_id")
        .lean(),
    ]);

    const progressDoc = progressDocRaw as ReadingProgressDoc | null;
    const readChapters = uniqueChapterNames(progressDoc?.readChapters);
    const lastReadChapter = normalizeString(progressDoc?.lastReadChapter);
    if (lastReadChapter && !readChapters.includes(lastReadChapter)) {
      readChapters.unshift(lastReadChapter);
    }

    return {
      bookmarked: Boolean(bookmarkDoc),
      readChapterNames: readChapters,
    };
  } catch (error) {
    console.error("Failed to load manga personal state:", error);
    return emptyPersonalState();
  }
};

export const getReadingHistoryPageForUser = async (
  userId: string,
  {
    page = 1,
    pageSize = DEFAULT_READING_HISTORY_PAGE_SIZE,
  }: {
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedReadingHistoryResult> => {
  try {
    const normalized = normalizeHistoryPagination(page, pageSize);

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
      const [facet] = await ReadingProgressModel.aggregate<{
        metadata: Array<{ total: number }>;
        items: HistoryAggRow[];
      }>(historyListPipeline(userId, skip, normalized.pageSize));

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

    const items = rows
      .map((row) => toReadingHistoryComic(row))
      .filter((item): item is ReadingHistoryComic => Boolean(item));

    return {
      items,
      page: safePage,
      pageSize: normalized.pageSize,
      totalItems,
      totalPages,
    };
  } catch (error) {
    console.error("Failed to load reading history:", error);
    return {
      items: [],
      page: 1,
      pageSize: DEFAULT_READING_HISTORY_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
    };
  }
};

const markChapterAsReadProgress = async (
  input: MarkChapterAsReadProgressInput,
): Promise<MarkChapterAsReadProgressResult> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, requiresSignIn: true };
  }

  const comicSlug = normalizeString(input.comicSlug);
  const chapterName = normalizeString(input.chapterName);
  if (!comicSlug || !chapterName) {
    return { success: false };
  }

  await connectToDatabase();
  const now = new Date();
  const previousDoc = (await ReadingProgressModel.findOneAndUpdate(
    {
      userId,
      comicSlug,
      readChapters: { $exists: true },
    },
    {
      $set: {
        comicId: normalizeString(input.comicId),
        lastReadChapter: chapterName,
        lastReadAt: now,
      },
      $addToSet: { readChapters: chapterName },
      $setOnInsert: {
        userId,
        comicSlug,
      },
    },
    {
      upsert: true,
      returnDocument: "before",
      lean: true,
    },
  )) as ReadingProgressDoc | null;

  const alreadyRead = uniqueChapterNames(previousDoc?.readChapters).includes(
    chapterName,
  );
  const didInsertNewRead = !previousDoc || !alreadyRead;

  if (didInsertNewRead) {
    try {
      await incrementUserReadingStatsForNewChapter(userId, 1);
    } catch (error) {
      console.error("Failed to increment user reading stats:", error);
    }
  }

  if (didInsertNewRead) {
    revalidatePath(`/manga/${comicSlug}`);
    revalidatePath("/bookmarks");
    revalidatePath("/history");
  }

  return { success: true };
};

export const recordChapterVisit = async (
  input: RecordChapterVisitInput,
): Promise<RecordChapterVisitResult> => {
  const [viewResult, progressResult] = await Promise.allSettled([
    trackMangaChapterView({
      comicId: input.comicId,
      comicSlug: input.comicSlug,
      comicName: input.comicName,
      thumbUrl: input.thumbUrl,
      comicUpdatedAt: input.comicUpdatedAt,
      chapterName: input.chapterName,
      latestChapterName: input.latestChapterName,
    }),
    markChapterAsReadProgress({
      comicId: input.comicId,
      comicSlug: input.comicSlug,
      chapterName: input.chapterName,
    }),
  ]);

  const trackedView =
    viewResult.status === "fulfilled" && Boolean(viewResult.value.success);
  const updatedProgress =
    progressResult.status === "fulfilled" &&
    Boolean(progressResult.value.success) &&
    !progressResult.value.requiresSignIn;

  return {
    success: trackedView,
    progressUpdated: updatedProgress,
  };
};
