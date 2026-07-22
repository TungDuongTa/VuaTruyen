import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChapterReaderPageClient } from "@/components/chapter-reader-page-client";
import { isMangaBookmarked } from "@/lib/actions/bookmark.actions";
import { getComicDetail, getChapterData } from "@/lib/actions/manga-actions";
import { getReadingProgressChapterNames } from "@/lib/actions/reading-progress.actions";
import { getSessionUser } from "@/lib/server-session";
import { withSiteSuffix } from "@/lib/seo";

type ChapterReaderPageProps = {
  params: Promise<{ id: string; chapter: string }>;
};

const getComicDetailCached = cache(async (slug: string) =>
  getComicDetail(slug),
);

export async function generateMetadata({
  params,
}: ChapterReaderPageProps): Promise<Metadata> {
  const { id, chapter } = await params;
  const comic = await getComicDetailCached(id);
  const comicSlug = comic?.slug || id;
  const canonicalPath = `/manga/${comicSlug}/chapter/${chapter}`;

  if (!comic) {
    return {
      title: `Không tìm thấy chapter ${chapter}`,
      description: "Không tìm thấy chapter bạn yêu cầu",
      alternates: {
        canonical: canonicalPath,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${comic.name} Chapter ${chapter}`;
  const description = `Đọc truyện tranh ${comic.name} chapter ${chapter} mới nhất được cập nhật tại Vuatruyen`;

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
    },
    twitter: {
      title: withSiteSuffix(title),
      description,
    },
  };
}

export default async function ChapterReaderPage({
  params,
}: ChapterReaderPageProps) {
  const { id, chapter } = await params;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    const callbackUrl = encodeURIComponent(`/manga/${id}/chapter/${chapter}`);

    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
            <h1 className="mb-3 text-2xl font-semibold text-foreground">
              Hãy đăng nhập để đọc chapter này
            </h1>
            <p className="mb-6 text-muted-foreground">
              Bạn cần đăng nhập để xem được nội dung của chapter này
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href={`/sign-in?callbackUrl=${callbackUrl}`}>
                <Button>Đăng nhập</Button>
              </Link>
              <Link href={`/manga/${id}`}>
                <Button variant="outline">Quay lại</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const [detailResult, bookmarkResult, readResult] = await Promise.allSettled([
    getComicDetailCached(id),
    isMangaBookmarked(id),
    getReadingProgressChapterNames(id),
  ]);

  const comic = detailResult.status === "fulfilled" ? detailResult.value : null;
  const initialBookmarked =
    bookmarkResult.status === "fulfilled" ? bookmarkResult.value : false;
  const initialReadChapterNames =
    readResult.status === "fulfilled" ? readResult.value : [];
  if (!comic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/manga/${id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  const allChapters = comic.chapters?.[0]?.server_data || [];
  const currentChapterData = allChapters.find(
    (c) => c.chapter_name === chapter,
  );

  if (!currentChapterData?.chapter_api_data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/manga/${comic.slug || id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  const chapterContent = await getChapterData(comic.slug || id, chapter);
  const chapterImages = chapterContent?.chapter_image || [];

  if (chapterImages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/manga/${comic.slug || id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <ChapterReaderPageClient
      id={id}
      chapter={chapter}
      comic={comic}
      chapterImages={chapterImages}
      initialBookmarked={initialBookmarked}
      initialReadChapterNames={initialReadChapterNames}
    />
  );
}
