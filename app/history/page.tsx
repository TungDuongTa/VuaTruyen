import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryPageClient } from "@/components/history-page-client";
import { withSiteSuffix } from "@/lib/seo";

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

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageClient />
    </Suspense>
  );
}
