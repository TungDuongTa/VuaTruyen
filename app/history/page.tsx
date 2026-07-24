import type { Metadata } from "next";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { MangaCardApi } from "@/components/manga-card-api";
import { LoginWall } from "@/components/login-wall";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toPositiveInt } from "@/lib/pagination";
import { formatShortDate } from "@/lib/date-time";
import { getReadingHistoryPageForUser } from "@/lib/actions/reading-progress.actions";
import { getSessionUser } from "@/lib/server/session";
import { withSiteSuffix } from "@/lib/seo";

const ITEMS_PER_PAGE = 24;

export const metadata: Metadata = {
  title: "Lịch sử",
  description: "Xem lại những bộ truyện bạn đã đọc gần đây tại VuaTruyen",
  alternates: {
    canonical: "/history",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: withSiteSuffix("Lịch sử"),
    description: "Xem lại những bộ truyện bạn đã đọc gần đây tại VuaTruyen",
    url: "/history",
  },
};

interface HistoryPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

const buildPageHref = (page: number) =>
  page > 1 ? `/history?page=${page}` : "/history";

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return (
      <LoginWall
        icon={Clock3}
        description="Vui lòng đăng nhập để xem lịch sử đọc truyện của bạn"
        callbackUrl="/history"
      />
    );
  }

  const requestedPage = toPositiveInt(params.page, 1);
  const historyResult = await getReadingHistoryPageForUser(sessionUser.id, {
    page: requestedPage,
    pageSize: ITEMS_PER_PAGE,
  });
  const readingHistory = historyResult.items;
  const currentPage = historyResult.page;
  const totalItems = historyResult.totalItems;
  const totalPages = historyResult.totalPages;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Lịch sử</h1>
          </div>
          <p className="text-muted-foreground">
            Những bộ truyện bạn đã đọc gần đây
          </p>
        </div>

        {totalItems > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
              <Badge className="bg-accent text-accent-foreground">
                {totalItems} truyện đã đọc
              </Badge>
              <p className="text-sm text-muted-foreground">
                Trang {currentPage} trên {totalPages}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {readingHistory.map((manga) => (
                <div key={manga.slug}>
                  <MangaCardApi comic={manga} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Đọc lần cuối vào {formatShortDate(manga.latestReadAt)}
                  </p>
                </div>
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              getPageHref={buildPageHref}
            />
          </>
        ) : (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Clock3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Chưa có lịch sử đọc truyện nào
            </h3>
            <p className="text-muted-foreground mb-4">
              Hãy thưởng thức một vài bộ truyện tranh
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
