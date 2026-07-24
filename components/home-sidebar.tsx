import { RankingSidebarApi } from "@/components/ranking-sidebar-api";
import { CommentsSection } from "@/components/comments-section";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCachedMangaRankings,
  getCachedRecentHomeComments,
} from "@/lib/server/manga-cache";

export function HomeSidebarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Streamed home rankings + recent comments (short-lived Data Cache). */
export async function HomeSidebar() {
  const [rankings, comments] = await Promise.all([
    getCachedMangaRankings(10),
    getCachedRecentHomeComments(10),
  ]);

  return (
    <div className="space-y-6">
      <RankingSidebarApi initialRankings={rankings} />
      <CommentsSection comments={comments} />
    </div>
  );
}
