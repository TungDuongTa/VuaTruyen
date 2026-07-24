import { connectToDatabase } from "@/database/mongoose";
import { MangaViewModel } from "@/database/models/manga-view.model";
import { MangaViewStatModel } from "@/database/models/manga-view-stat.model";
import type { OTruyenComic } from "@/types/manga-types";

export type MangaRankingPeriod = "daily" | "weekly" | "monthly" | "allTime";

export type MangaRankingItem = OTruyenComic & {
  periodViews: number;
  totalViews: number;
  latestChapterName?: string | null;
};

export type MangaRankings = {
  daily: MangaRankingItem[];
  weekly: MangaRankingItem[];
  monthly: MangaRankingItem[];
  allTime: MangaRankingItem[];
};

type PeriodRankingRow = {
  _id: string;
  periodViews: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_WINDOW_DAYS = 7;
const MONTH_WINDOW_DAYS = 30;
const DEFAULT_RANKING_LIMIT = 10;
const MAX_RANKING_LIMIT = 120;

const getUtcDayStart = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const addUtcDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * ONE_DAY_MS);

const toRankingItem = (doc: any, periodViews: number): MangaRankingItem => {
  const totalViews = Number(doc.totalViews || 0);
  const comicSlug = String(doc.comicSlug);
  const latestChapterName = String(doc.latestChapterName || "").trim();

  return {
    _id: doc.comicId || comicSlug,
    name: doc.comicName || comicSlug,
    slug: comicSlug,
    origin_name: [],
    status: "ongoing",
    thumb_url: doc.thumbUrl || "",
    category: [],
    updatedAt:
      doc.comicUpdatedAt ||
      new Date(doc.updatedAt || doc.createdAt).toISOString(),
    chaptersLatest: [],
    latestChapterName: latestChapterName || null,
    totalViews,
    periodViews: Number(periodViews || 0),
  };
};

const toPeriodRows = (rows: any[] = []): PeriodRankingRow[] =>
  rows
    .map((row) => ({
      _id: String(row?._id || "").trim(),
      periodViews: Number(row?.periodViews || 0),
    }))
    .filter((row) => Boolean(row._id) && row.periodViews > 0);

const getWindowRankings = async (
  limit: number,
): Promise<{
  daily: PeriodRankingRow[];
  weekly: PeriodRankingRow[];
  monthly: PeriodRankingRow[];
}> => {
  const todayStart = getUtcDayStart(new Date());
  const weeklyStart = addUtcDays(todayStart, -(WEEK_WINDOW_DAYS - 1));
  const monthlyStart = addUtcDays(todayStart, -(MONTH_WINDOW_DAYS - 1));

  const [result] = await MangaViewModel.aggregate([
    {
      $match: {
        $or: [
          { dayBucket: { $gte: monthlyStart } },
          { viewedAt: { $gte: monthlyStart } },
        ],
      },
    },
    {
      $project: {
        comicSlug: 1,
        metricDate: { $ifNull: ["$dayBucket", "$viewedAt"] },
        metricViews: { $ifNull: ["$views", 1] },
        metricLastViewedAt: { $ifNull: ["$lastViewedAt", "$viewedAt"] },
      },
    },
    {
      $group: {
        _id: "$comicSlug",
        dailyViews: {
          $sum: {
            $cond: [{ $gte: ["$metricDate", todayStart] }, "$metricViews", 0],
          },
        },
        weeklyViews: {
          $sum: {
            $cond: [{ $gte: ["$metricDate", weeklyStart] }, "$metricViews", 0],
          },
        },
        monthlyViews: { $sum: "$metricViews" },
        lastViewedAt: { $max: "$metricLastViewedAt" },
      },
    },
    {
      $facet: {
        daily: [
          { $match: { dailyViews: { $gt: 0 } } },
          { $sort: { dailyViews: -1, lastViewedAt: -1 } },
          { $limit: limit },
          { $project: { _id: 1, periodViews: "$dailyViews" } },
        ],
        weekly: [
          { $match: { weeklyViews: { $gt: 0 } } },
          { $sort: { weeklyViews: -1, lastViewedAt: -1 } },
          { $limit: limit },
          { $project: { _id: 1, periodViews: "$weeklyViews" } },
        ],
        monthly: [
          { $match: { monthlyViews: { $gt: 0 } } },
          { $sort: { monthlyViews: -1, lastViewedAt: -1 } },
          { $limit: limit },
          { $project: { _id: 1, periodViews: "$monthlyViews" } },
        ],
      },
    },
  ]);

  return {
    daily: toPeriodRows(result?.daily),
    weekly: toPeriodRows(result?.weekly),
    monthly: toPeriodRows(result?.monthly),
  };
};

const buildPeriodRanking = (
  rows: PeriodRankingRow[],
  statMap: Map<string, any>,
): MangaRankingItem[] =>
  rows
    .map((row) => {
      const stat = statMap.get(row._id);
      if (!stat) return null;
      return toRankingItem(stat, row.periodViews);
    })
    .filter((item): item is MangaRankingItem => Boolean(item));

/** Plain server read — safe to wrap with `"use cache"`. */
export async function fetchMangaRankings(
  limit: number = DEFAULT_RANKING_LIMIT,
): Promise<MangaRankings> {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(MAX_RANKING_LIMIT, Math.floor(limit)))
    : DEFAULT_RANKING_LIMIT;

  try {
    await connectToDatabase();

    const [windowRankings, allTimeRows] = await Promise.all([
      getWindowRankings(safeLimit),
      MangaViewStatModel.find({ totalViews: { $gt: 0 } })
        .sort({ totalViews: -1, lastViewedAt: -1 })
        .limit(safeLimit)
        .lean(),
    ]);
    const {
      daily: dailyRows,
      weekly: weeklyRows,
      monthly: monthlyRows,
    } = windowRankings;

    const periodSlugs = Array.from(
      new Set(
        [...dailyRows, ...weeklyRows, ...monthlyRows].map((row) => row._id),
      ),
    );

    const statDocs =
      periodSlugs.length > 0
        ? await MangaViewStatModel.find({
            comicSlug: { $in: periodSlugs },
          }).lean()
        : [];
    const statMap = new Map<string, any>(
      statDocs.map((doc: any) => [String(doc.comicSlug), doc]),
    );

    const daily = buildPeriodRanking(dailyRows, statMap);
    const weekly = buildPeriodRanking(weeklyRows, statMap);
    const monthly = buildPeriodRanking(monthlyRows, statMap);
    const allTime = allTimeRows.map((row: any) =>
      toRankingItem(row, Number(row.totalViews || 0)),
    );

    return { daily, weekly, monthly, allTime };
  } catch (error) {
    console.error("Failed to load manga rankings:", error);
    return {
      daily: [],
      weekly: [],
      monthly: [],
      allTime: [],
    };
  }
}
