import type { MetadataRoute } from "next";
import { getHomeData, getListByType } from "@/lib/actions/manga-actions";
import { getMangaRankings } from "@/lib/actions/manga-view.actions";
import {
  getAdultMangaCount,
  getAllMangaSlugs,
} from "@/lib/services/manga.service";
import { toAbsoluteUrl } from "@/lib/seo";

// Regenerate the sitemap hourly instead of freezing it at build time.
export const revalidate = 3600;

const normalizeSlug = (value: unknown): string => String(value || "").trim();

const getPublicMangaSlugs = async (): Promise<string[]> => {
  const slugSet = new Set<string>();

  try {
    const [homeData, latestData, completedData, ongoingData, rankingData, allSlugs] =
      await Promise.all([
        getHomeData(),
        getListByType("truyen-moi", 1),
        getListByType("hoan-thanh", 1),
        getListByType("dang-phat-hanh", 1),
        getMangaRankings(120),
        getAllMangaSlugs(),
      ]);

    const addItems = (items: Array<{ slug?: string }> = []) => {
      for (const item of items) {
        const slug = normalizeSlug(item.slug);
        if (slug) slugSet.add(slug);
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
    for (const slug of allSlugs) {
      slugSet.add(slug);
    }
  } catch (error) {
    console.error("Failed to build public manga sitemap entries:", error);
  }

  return Array.from(slugSet);
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [publicMangaSlugs, adultCount] = await Promise.all([
    getPublicMangaSlugs(),
    getAdultMangaCount(),
  ]);

  const total18Pages = Math.max(1, Math.ceil(adultCount / 24));

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
      url: toAbsoluteUrl("/latest"),
      lastModified: now,
      changeFrequency: "hourly",
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

  const paginated18Routes: MetadataRoute.Sitemap = Array.from(
    { length: total18Pages },
    (_, index) => {
      const pageNumber = index + 1;
      const pagePath = pageNumber === 1 ? "/18+" : `/18+?page=${pageNumber}`;
      return {
        url: toAbsoluteUrl(pagePath),
        lastModified: now,
        changeFrequency: "daily",
        priority: pageNumber === 1 ? 0.7 : 0.6,
      };
    },
  );

  const mangaRoutes: MetadataRoute.Sitemap = publicMangaSlugs.map((slug) => ({
    url: toAbsoluteUrl(`/manga/${slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...paginated18Routes, ...mangaRoutes];
}
