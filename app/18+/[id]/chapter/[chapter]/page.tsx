import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChapterReaderPageClient } from "@/components/chapter-reader-page-client";
import { isMangaBookmarked } from "@/lib/actions/bookmark.actions";
import {
  getManga18ChapterContent,
  getManga18Detail,
} from "@/lib/actions/manga18.actions";
import { getReadingProgressChapterNames } from "@/lib/actions/reading-progress.actions";
import { withSiteSuffix } from "@/lib/seo";

type Manga18ChapterReaderPageProps = {
  params: Promise<{ id: string; chapter: string }>;
};

const getManga18DetailCached = cache(async (slug: string) =>
  getManga18Detail(slug),
);

export async function generateMetadata({
  params,
}: Manga18ChapterReaderPageProps): Promise<Metadata> {
  const { id, chapter } = await params;
  const comic = await getManga18DetailCached(id);
  const canonicalPath = `/18+/${comic?.slug || id}/chapter/${chapter}`;

  if (!comic) {
    return {
      title: `Không tìm thấy chapter ${chapter} `,
      description: "Không tìm thấy chapter này.",
      alternates: {
        canonical: canonicalPath,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const title = `${comic.name} Chapter ${chapter} (18+)`;
  const description = `Đọc truyện 18+ ${comic.name} chapter ${chapter} mới nhất được cập nhật liên tục tại VuaTruyen.`;

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

export default async function Manga18ChapterReaderPage({
  params,
}: Manga18ChapterReaderPageProps) {
  const { id, chapter } = await params;

  const [detailResult, chapterResult, bookmarkResult, readResult] =
    await Promise.allSettled([
      getManga18DetailCached(id),
      getManga18ChapterContent({ mangaSlug: id, chapter }),
      isMangaBookmarked(id),
      getReadingProgressChapterNames(id),
    ]);

  const comic = detailResult.status === "fulfilled" ? detailResult.value : null;
  const chapterContent =
    chapterResult.status === "fulfilled" ? chapterResult.value : null;
  const initialBookmarked =
    bookmarkResult.status === "fulfilled" ? bookmarkResult.value : false;
  const initialReadChapterNames =
    readResult.status === "fulfilled" ? readResult.value : [];

  if (!comic || !chapterContent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Không tìm thấy chapter
        </h1>
        <Link href={`/18+/${id}`}>
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <ChapterReaderPageClient
      id={id}
      chapter={chapterContent.chapterName}
      comic={comic}
      chapterImages={chapterContent.chapterImages}
      chapterPath=""
      initialBookmarked={initialBookmarked}
      initialReadChapterNames={initialReadChapterNames}
      routeBase="/18+"
    />
  );
}
