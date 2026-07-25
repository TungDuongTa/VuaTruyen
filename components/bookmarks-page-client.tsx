"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";
import { MangaCardApi } from "@/components/manga-card-api";
import { LoginWall } from "@/components/login-wall";
import { PaginationControls } from "@/components/pagination-controls";
import { RemoveBookmarkButton } from "@/components/remove-bookmark-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/better-auth/auth-client";
import { getMyBookmarksPage } from "@/lib/actions/bookmark.actions";
import { formatShortDate } from "@/lib/date-time";
import { toPositiveInt } from "@/lib/pagination";
import {
  bookmarksListCacheKey,
  getLastPersonalListUserId,
  rememberPersonalListUserId,
} from "@/lib/personal-list-cache";
import { usePersonalList } from "@/hooks/use-personal-list";
import type { PaginatedBookmarksResult } from "@/lib/actions/bookmark.actions";

const ITEMS_PER_PAGE = 24;

const buildPageHref = (page: number) =>
  page > 1 ? `/bookmarks?page=${page}` : "/bookmarks";

export function BookmarksPageClient() {
  const searchParams = useSearchParams();
  const requestedPage = toPositiveInt(searchParams.get("page"), 1);
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const effectiveUserId =
    userId ?? (isPending ? getLastPersonalListUserId() : null);

  const cacheKey = effectiveUserId
    ? bookmarksListCacheKey(effectiveUserId, requestedPage)
    : null;

  const fetcher = useCallback(
    () => getMyBookmarksPage(requestedPage, ITEMS_PER_PAGE),
    [requestedPage],
  );

  const { data, isLoading, error, refresh } =
    usePersonalList<PaginatedBookmarksResult>({
      cacheKey,
      fetcher,
      enabled: Boolean(userId),
    });

  useEffect(() => {
    if (userId) rememberPersonalListUserId(userId);
  }, [userId]);

  const emptyResult = useMemo<PaginatedBookmarksResult>(
    () => ({
      items: [],
      page: requestedPage,
      pageSize: ITEMS_PER_PAGE,
      totalItems: 0,
      totalPages: 1,
    }),
    [requestedPage],
  );

  if (!isPending && !userId) {
    return (
      <LoginWall
        icon={Bookmark}
        description="Vui lòng đăng nhập để xem danh sách theo dõi của bạn"
        callbackUrl="/bookmarks"
      />
    );
  }

  const result = data ?? emptyResult;
  const bookmarkedManga = result.items;
  const currentPage = result.page;
  const totalItems = result.totalItems;
  const totalPages = result.totalPages;
  const showEmpty = !isLoading && !error && totalItems === 0 && Boolean(userId);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Theo dõi</h1>
          </div>
          <p className="text-muted-foreground">
            Danh sách truyện bạn đang theo dõi
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : totalItems > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
              <Badge className="bg-accent text-accent-foreground">
                {totalItems} đã lưu
              </Badge>
              <p className="text-sm text-muted-foreground">
                Trang {currentPage} trên {totalPages}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {bookmarkedManga.map((manga) => (
                <div key={manga.slug}>
                  <MangaCardApi comic={manga} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Bắt đầu theo dõi từ{" "}
                      {formatShortDate(manga.bookmarkedAt)}
                    </p>
                    <RemoveBookmarkButton
                      slug={manga.slug}
                      mangaName={manga.name}
                      onRemoved={() => {
                        void refresh({ force: true });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              getPageHref={buildPageHref}
            />
          </>
        ) : showEmpty ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Bạn chưa theo dõi bộ truyện nào
            </h3>
            <p className="text-muted-foreground mb-4">
              Hãy theo dõi truyện để hiển thị danh sách
            </p>
            <Link href="/browse">
              <Button>Khám phá truyện mới</Button>
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
