import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BookmarksPageClient } from "@/components/bookmarks-page-client";
import { toPositiveInt } from "@/lib/pagination";
import { withSiteSuffix } from "@/lib/seo";

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

export default async function BookmarksPage({
  searchParams,
}: BookmarksPageProps) {
  const params = await searchParams;

  // Old combined-page URLs → dedicated history route.
  if (params.tab === "history") {
    const historyPage = toPositiveInt(params.historyPage || params.page, 1);
    redirect(historyPage > 1 ? `/history?page=${historyPage}` : "/history");
  }

  return (
    <Suspense fallback={null}>
      <BookmarksPageClient />
    </Suspense>
  );
}
