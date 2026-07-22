import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MangaDetailPageClient } from "@/components/manga-detail-page-client";
import { isMangaBookmarked } from "@/lib/actions/bookmark.actions";
import { getMangaViewStats } from "@/lib/actions/manga-view.actions";
import { getComicDetail } from "@/lib/actions/manga-actions";
import { getReadingProgressChapterNames } from "@/lib/actions/reading-progress.actions";
import { stripHtml, truncateText, withSiteSuffix } from "@/lib/seo";

type MangaDetailPageProps = {
  params: Promise<{ id: string }>;
};

const getComicDetailCached = cache(async (slug: string) =>
  getComicDetail(slug),
);

export async function generateMetadata({
  params,
}: MangaDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const comic = await getComicDetailCached(id);
  const canonicalPath = `/manga/${comic?.slug || id}`;

  if (!comic) {
    return {
      title: "Không tìm thấy truyện",
      description: "Không tìm thấy truyện",
      alternates: {
        canonical: canonicalPath,
      },
    };
  }

  const fallbackDescription = `Đọc truyện ${comic.name} mới nhất được cập nhật tại VuaTruyen `;
  const description = truncateText(
    stripHtml(comic.content || "") || fallbackDescription,
    160,
  );
  const title = `Truyện tranh ${comic.name} `;
  const coverImage = comic.thumb_url?.trim() ? comic.thumb_url : "";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: withSiteSuffix(title),
      description,
      type: "article",
      url: canonicalPath,
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: comic.name,
            },
          ]
        : undefined,
    },
    twitter: {
      title: withSiteSuffix(title),
      description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default async function MangaDetailPage({
  params,
}: MangaDetailPageProps) {
  const { id } = await params;

  const [detailResult, bookmarkResult, readResult, viewResult] =
    await Promise.allSettled([
      getComicDetailCached(id),
      isMangaBookmarked(id),
      getReadingProgressChapterNames(id),
      getMangaViewStats(id),
    ]);

  const comic = detailResult.status === "fulfilled" ? detailResult.value : null;

  if (!comic) {
    return (
      <div className="min-h-screen">
        <main className="flex min-h-[60vh] flex-col items-center justify-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            Không tìm thấy truyện
          </h1>
          <Link href="/">
            <Button>Quay về trang chủ</Button>
          </Link>
        </main>
      </div>
    );
  }

  const initialBookmarked =
    bookmarkResult.status === "fulfilled" ? bookmarkResult.value : false;
  const initialReadChapterNames =
    readResult.status === "fulfilled" ? readResult.value : [];
  const initialTotalViews =
    viewResult.status === "fulfilled" ? viewResult.value.totalViews : 0;

  return (
    <MangaDetailPageClient
      id={id}
      comic={comic}
      initialBookmarked={initialBookmarked}
      initialReadChapterNames={initialReadChapterNames}
      initialTotalViews={initialTotalViews}
    />
  );
}
