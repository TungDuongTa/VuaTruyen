import type { MetadataRoute } from "next";
import { getHomeData, getListByType } from "@/lib/actions/manga-actions";
import { getMangaRankings } from "@/lib/actions/manga-view.actions";
import {
  getAdultMangaCount,
  getMangaSitemapEntries,
} from "@/lib/services/manga.service";
import { toAbsoluteUrl } from "@/lib/seo";

const normalizeSlug = (value: unknown): string => String(value || "").trim();

const getPublicMangaEntries = async () => {
  const entryMap = new Map<
    string,
    { slug: string; latestChapterName: string; updatedAt: Date }
  >();

  try {
    const [
      homeData,
      latestData,
      completedData,
      ongoingData,
      rankingData,
      allEntries,
    ] = await Promise.all([
      getHomeData(),
      getListByType("truyen-moi", 1),
      getListByType("hoan-thanh", 1),
      getListByType("dang-phat-hanh", 1),
      getMangaRankings(120),
      getMangaSitemapEntries(),
    ]);

    const upsert = (
      slugRaw: unknown,
      latestChapterName = "",
      updatedAt: Date = new Date(),
    ) => {
      const slug = normalizeSlug(slugRaw);
      if (!slug) return;

      const existing = entryMap.get(slug);
      entryMap.set(slug, {
        slug,
        latestChapterName:
          latestChapterName || existing?.latestChapterName || "",
        updatedAt: existing?.updatedAt || updatedAt,
      });
    };

    const addItems = (
      items: Array<{
        slug?: string;
        chaptersLatest?: Array<{ chapter_name?: string }>;
        updatedAt?: string;
      }> = [],
    ) => {
      for (const item of items) {
        upsert(
          item.slug,
          item.chaptersLatest?.[0]?.chapter_name || "",
          item.updatedAt ? new Date(item.updatedAt) : new Date(),
        );
      }
    };

    addItems(homeData);
    addItems(latestData?.items || []);
    addItems(completedData?.items || []);
    addItems(ongoingData?.items || []);
    addItems(rankingData.daily || []);
    addItems(rankingData.weekly || []);
    addItems(rankingData.monthly || []);
    addItems(rankingData.allTime || []);

    for (const entry of allEntries) {
      upsert(entry.slug, entry.latestChapterName, entry.updatedAt);
    }
  } catch (error) {
    console.error("Failed to build public manga sitemap entries:", error);
  }

  return Array.from(entryMap.values());
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [publicMangaEntries, adultCount] = await Promise.all([
    getPublicMangaEntries(),
    getAdultMangaCount(),
  ]);

  // Cap sitemap pagination depth so the XML stays lean.
  const total18Pages = Math.min(
    20,
    Math.max(1, Math.ceil(adultCount / 24)),
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/browse"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl("/ranking"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/18+"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Page 1 is already in staticRoutes — only emit ?page=2+.
  const paginated18Routes: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(0, total18Pages - 1) },
    (_, index) => {
      const pageNumber = index + 2;
      return {
        url: toAbsoluteUrl(`/18+?page=${pageNumber}`),
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.6,
      };
    },
  );

  const mangaRoutes: MetadataRoute.Sitemap = publicMangaEntries.map(
    (entry) => ({
      url: toAbsoluteUrl(`/manga/${entry.slug}`),
      lastModified: entry.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }),
  );

  const latestChapterRoutes: MetadataRoute.Sitemap = publicMangaEntries
    .filter((entry) => entry.latestChapterName)
    .map((entry) => ({
      url: toAbsoluteUrl(
        `/manga/${entry.slug}/chapter/${entry.latestChapterName}`,
      ),
      lastModified: entry.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

  return [
    ...staticRoutes,
    ...paginated18Routes,
    ...mangaRoutes,
    ...latestChapterRoutes,
  ];
}
