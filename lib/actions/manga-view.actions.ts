"use server";

import { connectToDatabase } from "@/database/mongoose";
import { MangaViewModel } from "@/database/models/manga-view.model";
import { MangaViewStatModel } from "@/database/models/manga-view-stat.model";
import {
  fetchMangaRankings,
  type MangaRankings,
} from "@/lib/server/manga-rankings";

type TrackMangaChapterViewInput = {
  comicId?: string;
  comicSlug: string;
  comicName?: string;
  thumbUrl?: string;
  comicUpdatedAt?: string;
  chapterName: string;
  latestChapterName?: string;
};

type TrackMangaChapterViewResult = {
  success: boolean;
};

export type MangaViewStats = {
  comicSlug: string;
  totalViews: number;
  lastViewedAt: string | null;
};

const getUtcDayStart = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

export const trackMangaChapterView = async (
  input: TrackMangaChapterViewInput,
): Promise<TrackMangaChapterViewResult> => {
  const comicSlug = input.comicSlug?.trim();
  const chapterName = input.chapterName?.trim();

  if (!comicSlug || !chapterName) {
    return { success: false };
  }

  try {
    await connectToDatabase();

    const now = new Date();
    const dayBucket = getUtcDayStart(now);
    const metadata = {
      comicId: input.comicId || "",
      comicSlug,
      comicName: input.comicName || "",
      thumbUrl: input.thumbUrl || "",
      comicUpdatedAt: input.comicUpdatedAt || "",
    };
    const normalizedLatestChapterName = String(
      input.latestChapterName || "",
    ).trim();
    const mutableFields: Record<string, any> = {
      ...metadata,
    };

    if (normalizedLatestChapterName) {
      mutableFields.latestChapterName = normalizedLatestChapterName;
    }

    await Promise.all([
      MangaViewModel.updateOne(
        { comicSlug, dayBucket },
        {
          $set: mutableFields,
          $inc: { views: 1 },
          $max: { lastViewedAt: now },
        },
        { upsert: true },
      ),
      MangaViewStatModel.updateOne(
        { comicSlug },
        {
          $set: mutableFields,
          $inc: { totalViews: 1 },
          $max: { lastViewedAt: now },
        },
        { upsert: true },
      ),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Failed to track manga view:", error);
    return { success: false };
  }
};

export const getMangaViewStats = async (
  comicSlug: string,
): Promise<MangaViewStats> => {
  const normalizedSlug = comicSlug.trim();
  if (!normalizedSlug) {
    return { comicSlug: "", totalViews: 0, lastViewedAt: null };
  }

  try {
    await connectToDatabase();
    const doc = await MangaViewStatModel.findOne({ comicSlug: normalizedSlug })
      .select("comicSlug totalViews lastViewedAt")
      .lean();

    if (!doc) {
      return {
        comicSlug: normalizedSlug,
        totalViews: 0,
        lastViewedAt: null,
      };
    }

    return {
      comicSlug: String(doc.comicSlug),
      totalViews: Number(doc.totalViews || 0),
      lastViewedAt: doc.lastViewedAt
        ? new Date(doc.lastViewedAt).toISOString()
        : null,
    };
  } catch (error) {
    console.error("Failed to load manga view stats:", error);
    return {
      comicSlug: normalizedSlug,
      totalViews: 0,
      lastViewedAt: null,
    };
  }
};

export const getMangaRankings = async (
  limit?: number,
): Promise<MangaRankings> => fetchMangaRankings(limit);
