import Link from "next/link";
import { Trophy, Eye } from "lucide-react";
import { MangaCardApi } from "@/components/manga-card-api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getCachedMangaRankings } from "@/lib/server/manga-cache";
import type { MangaRankingPeriod } from "@/lib/server/manga-rankings";
import { getVisiblePages } from "@/lib/pagination";
import { formatViewCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  RANKING_ITEMS_PER_PAGE,
  RANKING_MAX_ITEMS,
  RANKING_TABS,
  buildRankingHref,
} from "@/lib/ranking-params";
import { toPositiveInt } from "@/lib/pagination";

type RankingCatalogPageProps = {
  tab: MangaRankingPeriod;
  requestedPage: number;
};

export async function RankingCatalogPage({
  tab,
  requestedPage,
}: RankingCatalogPageProps) {
  const safeRequestedPage = toPositiveInt(requestedPage, 1);
  const rankings = await getCachedMangaRankings(RANKING_MAX_ITEMS);
  const rankedComics = rankings[tab].slice(0, RANKING_MAX_ITEMS);

  const totalPages = Math.max(
    1,
    Math.ceil(rankedComics.length / RANKING_ITEMS_PER_PAGE),
  );
  const currentPage = Math.min(
    Math.max(1, safeRequestedPage),
    totalPages,
  );
  const startIndex = (currentPage - 1) * RANKING_ITEMS_PER_PAGE;
  const pageComics = rankedComics.slice(
    startIndex,
    startIndex + RANKING_ITEMS_PER_PAGE,
  );

  const visiblePages = getVisiblePages(currentPage, totalPages, 7);
  const showStartEllipsis = visiblePages.length > 0 && visiblePages[0] > 2;
  const showEndEllipsis =
    visiblePages.length > 0 &&
    visiblePages[visiblePages.length - 1] < totalPages - 1;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-chart-3" />
            <h1 className="text-3xl font-bold text-foreground">
              Bảng xếp hạng
            </h1>
          </div>
          <p className="text-muted-foreground">
            Khám phá những bộ truyện tranh được xem nhiều nhất bởi đọc giả.
          </p>
        </section>

        <section className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/70 p-2">
          {RANKING_TABS.map(({ key, label, Icon }) => (
            <Link
              key={key}
              href={buildRankingHref(key, 1)}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </section>

        {rankedComics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/60 py-16 text-center text-muted-foreground">
            Chưa có dữ liệu cho mốc thời gian này.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 md:gap-6">
              {pageComics.map((comic, index) => {
                const rank = startIndex + index + 1;
                const views = formatViewCount(
                  tab === "allTime"
                    ? comic.totalViews || 0
                    : comic.periodViews || 0,
                );
                const latestChapterRaw = String(
                  comic.latestChapterName ||
                    comic.chaptersLatest?.[0]?.chapter_name ||
                    "",
                ).trim();
                const latestChapterLabel = latestChapterRaw
                  ? latestChapterRaw.toLowerCase().startsWith("chapter")
                    ? latestChapterRaw
                    : `Chapter ${latestChapterRaw}`
                  : "Chapter -";

                return (
                  <article key={`${tab}-${comic._id}-${rank}`}>
                    <MangaCardApi comic={comic} showLatestChapter={false} />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-xs text-muted-foreground">
                        {latestChapterLabel}
                      </p>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{views}</span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>

            {totalPages > 1 && (
              <section className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={buildRankingHref(
                          tab,
                          Math.max(1, currentPage - 1),
                        )}
                        aria-disabled={currentPage === 1}
                        className={cn(
                          currentPage === 1 && "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>

                    {visiblePages.length > 0 && visiblePages[0] > 1 && (
                      <PaginationItem>
                        <PaginationLink href={buildRankingHref(tab, 1)}>
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    {showStartEllipsis && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {visiblePages.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href={buildRankingHref(tab, page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    {showEndEllipsis && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    {visiblePages.length > 0 &&
                      visiblePages[visiblePages.length - 1] < totalPages && (
                        <PaginationItem>
                          <PaginationLink
                            href={buildRankingHref(tab, totalPages)}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                    <PaginationItem>
                      <PaginationNext
                        href={buildRankingHref(
                          tab,
                          Math.min(totalPages, currentPage + 1),
                        )}
                        aria-disabled={currentPage === totalPages}
                        className={cn(
                          currentPage === totalPages &&
                            "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
