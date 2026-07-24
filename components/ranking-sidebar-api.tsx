"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, TrendingUp, Clock, Flame, Eye } from "lucide-react";
import type {
  MangaRankingItem,
  MangaRankingPeriod,
  MangaRankings,
} from "@/lib/server/manga-rankings";
import { formatViewCount } from "@/lib/format";

const FALLBACK_COVER =
  "https://placehold.co/200x300/111827/9CA3AF?text=No+Cover";

interface RankingSidebarApiProps {
  initialRankings: MangaRankings;
}

const getMedalClassName = (index: number) => {
  if (index === 0) return "bg-chart-3 text-background";
  if (index === 1) return "bg-gray-400 text-background";
  if (index === 2) return "bg-amber-700 text-background";
  return "bg-secondary text-muted-foreground";
};

const periodTabs: Array<{
  key: MangaRankingPeriod;
  label: string;
  Icon: typeof Flame;
}> = [
  { key: "daily", label: "Ngày", Icon: Flame },
  { key: "weekly", label: "Tuần", Icon: TrendingUp },
  { key: "monthly", label: "Tháng", Icon: Clock },
  { key: "allTime", label: "Tất cả", Icon: Trophy },
];

const formatLatestChapter = (chapterName?: string | null) => {
  const normalized = String(chapterName || "").trim();
  if (!normalized) return "Chapter -";

  return normalized.toLowerCase().startsWith("chapter")
    ? normalized
    : `Chapter ${normalized}`;
};

export function RankingSidebarApi({ initialRankings }: RankingSidebarApiProps) {
  const [activeTab, setActiveTab] = useState<MangaRankingPeriod>("daily");
  const rankedComics: MangaRankingItem[] = initialRankings[activeTab] || [];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-chart-3" />
        <h3 className="text-lg font-semibold text-foreground">
          Top truyện đề cử
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-1 mb-4 bg-secondary/50 p-1 rounded-lg">
        {periodTabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rankedComics.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu lượt xem.
          </div>
        ) : (
          rankedComics.map((comic, index) => (
            <Link
              key={`${activeTab}-${comic._id}`}
              href={`/manga/${comic.slug}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getMedalClassName(index)}`}
              >
                {index + 1}
              </div>

              <div className="relative w-10 h-14 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={
                    comic.thumb_url?.trim() ? comic.thumb_url : FALLBACK_COVER
                  }
                  alt={comic.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {comic.name}
                </h4>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {formatLatestChapter(
                      comic.latestChapterName ||
                        comic.chaptersLatest?.[0]?.chapter_name,
                    )}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>
                      {formatViewCount(
                        activeTab === "allTime"
                          ? comic.totalViews || 0
                          : comic.periodViews || 0,
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
