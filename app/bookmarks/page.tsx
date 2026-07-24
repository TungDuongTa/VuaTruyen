import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { MangaCardApi } from "@/components/manga-card-api";
import { LoginWall } from "@/components/login-wall";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toPositiveInt } from "@/lib/pagination";
import { formatShortDate } from "@/lib/date-time";
import {
  getBookmarksPageForUser,
  removeMangaBookmark,
} from "@/lib/actions/bookmark.actions";
import { getSessionUser } from "@/lib/server/session";
import { withSiteSuffix } from "@/lib/seo";
import { redirect } from "next/navigation";

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = {
  title: "Theo dõi",
  description: "Quản lí danh sách truyện yêu thích của bạn tại VuaTruyen",
  alternates: {
    canonical: "/bookmarks",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: withSiteSuffix("Theo dõi"),
    description: "Quản lí danh sách truyện yêu thích của bạn tại VuaTruyen",
    url: "/bookmarks",
  },
};

interface BookmarksPageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    historyPage?: string;
  }>;
}

const buildPageHref = (page: number) =>
  page > 1 ? `/bookmarks?page=${page}` : "/bookmarks";

export default async function BookmarksPage({
  searchParams,
}: BookmarksPageProps) {
  const params = await searchParams;

  // Old combined-page URLs → dedicated history route.
  if (params.tab === "history") {
    const historyPage = toPositiveInt(params.historyPage || params.page, 1);
    redirect(historyPage > 1 ? `/history?page=${historyPage}` : "/history");
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return (
      <LoginWall
        icon={Bookmark}
        description="Vui lòng đăng nhập để xem danh sách theo dõi của bạn"
        callbackUrl="/bookmarks"
      />
    );
  }

  const requestedPage = toPositiveInt(params.page, 1);
  const bookmarkResult = await getBookmarksPageForUser(sessionUser.id, {
    page: requestedPage,
    pageSize: ITEMS_PER_PAGE,
  });
  const bookmarkedManga = bookmarkResult.items;
  const currentPage = bookmarkResult.page;
  const totalItems = bookmarkResult.totalItems;
  const totalPages = bookmarkResult.totalPages;

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

        {totalItems > 0 ? (
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
              {bookmarkedManga.map((manga) => {
                const removeAction = removeMangaBookmark.bind(null, manga.slug);

                return (
                  <div key={manga.slug}>
                    <MangaCardApi comic={manga} />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Bắt đầu theo dõi từ{" "}
                        {formatShortDate(manga.bookmarkedAt)}
                      </p>
                      <form action={removeAction}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Xóa ${manga.name} khỏi danh sách theo dõi`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              getPageHref={buildPageHref}
            />
          </>
        ) : (
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
        )}
      </main>
    </div>
  );
}
