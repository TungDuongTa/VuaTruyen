"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import {
  createComment,
  getChapterComments,
  getMangaComments,
  toggleCommentLike,
  type CommentFeedItem,
  type CommentFeedPagination,
  type CommentViewer,
} from "@/lib/actions/comment.actions";
import { COMMENT_MAX_DEPTH } from "@/lib/comments/limits";
import { getVisiblePages } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentThread } from "@/components/comments/comment-thread";
import {
  COMMENTS_PAGE_SIZE,
  getCommentDepth,
  normalizeComment,
  resolveThreadRootId,
  sortNewestFirst,
  sortOldestFirst,
} from "@/components/comments/comment-utils";

type MangaCommentsSectionProps = {
  comicSlug: string;
  comicName: string;
  chapterName?: string;
  className?: string;
};

const EMPTY_PAGINATION: CommentFeedPagination = {
  page: 1,
  pageSize: COMMENTS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export function MangaCommentsSection({
  comicSlug,
  comicName,
  chapterName,
  className,
}: MangaCommentsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [viewer, setViewer] = useState<CommentViewer>(null);
  const [comments, setComments] = useState<CommentFeedItem[]>([]);
  const [pagination, setPagination] =
    useState<CommentFeedPagination>(EMPTY_PAGINATION);
  const [currentPage, setCurrentPage] = useState(1);
  const [newComment, setNewComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedReplyThreads, setCollapsedReplyThreads] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingReplyTo, setSubmittingReplyTo] = useState<string | null>(
    null,
  );
  const [likingCommentIds, setLikingCommentIds] = useState<Set<string>>(
    new Set(),
  );

  const isChapterScope = Boolean(chapterName);
  const normalizedComicName = comicName?.trim() || "";
  const searchParamString = searchParams.toString();
  const signInHref = useMemo(() => {
    const callbackPath = pathname || "/";
    const callbackUrl = searchParamString
      ? `${callbackPath}?${searchParamString}`
      : callbackPath;

    return `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }, [pathname, searchParamString]);
  const redirectToSignIn = useCallback(() => {
    router.push(signInHref);
  }, [router, signInHref]);

  const scopeMeta = useMemo(
    () =>
      isChapterScope
        ? {
            title: `Bình luận về chapter ${chapterName}`,
            subtitle: "Chỉ có bình luận của chapter này được hiển thị tại đây.",
          }
        : {
            title: "Bình luận",
            subtitle: "Tất cả bình luận của truyện đều được hiển thị tại đây",
          },
    [chapterName, isChapterScope],
  );

  const commentsById = useMemo(
    () => new Map(comments.map((comment) => [comment.id, comment])),
    [comments],
  );

  const childrenByParentId = useMemo(() => {
    const map = new Map<string, CommentFeedItem[]>();
    for (const comment of comments) {
      if (!comment.parentCommentId) continue;
      const current = map.get(comment.parentCommentId) || [];
      current.push(comment);
      map.set(comment.parentCommentId, current);
    }

    for (const [key, value] of map.entries()) {
      map.set(key, value.sort(sortOldestFirst));
    }

    return map;
  }, [comments]);

  const rootComments = useMemo(
    () =>
      comments
        .filter((comment) => !comment.parentCommentId)
        .sort(sortNewestFirst),
    [comments],
  );

  const descendantCountById = useMemo(() => {
    const memo = new Map<string, number>();

    const countChildren = (parentId: string): number => {
      if (memo.has(parentId)) return memo.get(parentId) || 0;

      const children = childrenByParentId.get(parentId) || [];
      let total = children.length;

      for (const child of children) {
        total += countChildren(child.id);
      }

      memo.set(parentId, total);
      return total;
    };

    const result = new Map<string, number>();
    for (const comment of comments) {
      result.set(comment.id, countChildren(comment.id));
    }
    return result;
  }, [childrenByParentId, comments]);

  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, pagination.totalPages, 5),
    [currentPage, pagination.totalPages],
  );

  const loadComments = useCallback(
    async (requestedPage: number) => {
      if (!comicSlug) {
        setComments([]);
        setViewer(null);
        setPagination(EMPTY_PAGINATION);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const feedData =
          isChapterScope && chapterName
            ? await getChapterComments(
                comicSlug,
                chapterName,
                requestedPage,
                COMMENTS_PAGE_SIZE,
              )
            : await getMangaComments(
                comicSlug,
                requestedPage,
                COMMENTS_PAGE_SIZE,
              );

        setViewer(feedData.viewer);
        setComments(feedData.comments.map(normalizeComment));
        setPagination(feedData.pagination);
        if (feedData.pagination.page !== requestedPage) {
          setCurrentPage(feedData.pagination.page);
        }
      } catch (error) {
        console.error("Failed to load comments:", error);
        toast.error("Could not load comments right now.");
      } finally {
        setIsLoading(false);
      }
    },
    [chapterName, comicSlug, isChapterScope],
  );

  useEffect(() => {
    setCurrentPage(1);
    setExpandedThreads(new Set());
    setCollapsedReplyThreads(new Set());
    setActiveReplyId(null);
    setReplyDrafts({});
  }, [chapterName, comicSlug, isChapterScope]);

  useEffect(() => {
    loadComments(currentPage);
  }, [currentPage, loadComments]);

  const setThreadExpanded = (rootId: string, expanded: boolean) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(rootId);
      else next.delete(rootId);
      return next;
    });
  };

  const setChildThreadExpanded = (commentId: string, expanded: boolean) => {
    setCollapsedReplyThreads((prev) => {
      const next = new Set(prev);
      if (expanded) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const getRootIdForComment = (comment: CommentFeedItem) =>
    resolveThreadRootId(comment, commentsById);

  const handleStartReply = (comment: CommentFeedItem) => {
    if (!viewer) {
      toast.error("Vui lòng đăng nhập để trả lời bình luận.");
      redirectToSignIn();
      return;
    }

    if (getCommentDepth(comment, commentsById) >= COMMENT_MAX_DEPTH) {
      toast.error(`Chỉ được trả lời tối đa ${COMMENT_MAX_DEPTH} cấp.`);
      return;
    }

    const rootId = getRootIdForComment(comment);
    setActiveReplyId(comment.id);
    setThreadExpanded(rootId, true);
  };

  const handleSubmitRootComment = async () => {
    if (isSubmitting) return;

    const content = newComment.trim();
    if (!content) {
      toast.error("Please enter a comment before posting.");
      return;
    }

    if (!viewer) {
      toast.error("Vui lòng đăng nhập để bình luận.");
      redirectToSignIn();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createComment({
        comicSlug,
        comicName: normalizedComicName || undefined,
        content,
        targetType: isChapterScope ? "chapter" : "manga",
        chapterName: chapterName || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        if (result.requiresSignIn) redirectToSignIn();
        return;
      }

      setNewComment("");
      setCurrentPage(1);
      await loadComments(1);
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Could not post your comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (targetComment: CommentFeedItem) => {
    if (!viewer) {
      toast.error("Vui lòng đăng nhập để trả lời bình luận.");
      redirectToSignIn();
      return;
    }

    if (getCommentDepth(targetComment, commentsById) >= COMMENT_MAX_DEPTH) {
      toast.error(`Chỉ được trả lời tối đa ${COMMENT_MAX_DEPTH} cấp.`);
      return;
    }

    const draft = (replyDrafts[targetComment.id] || "").trim();
    if (!draft) {
      toast.error("Hãy điền bình luận trước khi đăng");
      return;
    }

    const rootId = getRootIdForComment(targetComment);
    setSubmittingReplyTo(targetComment.id);
    try {
      const result = await createComment({
        comicSlug,
        comicName: normalizedComicName || undefined,
        content: draft,
        parentCommentId: targetComment.id,
      });

      if (!result.success) {
        toast.error(result.message);
        if (result.requiresSignIn) redirectToSignIn();
        return;
      }

      setReplyDrafts((prev) => ({ ...prev, [targetComment.id]: "" }));
      setActiveReplyId(null);
      setThreadExpanded(rootId, true);

      if (result.comment) {
        const normalizedReply = normalizeComment(
          result.comment as CommentFeedItem,
        );
        const safeReply = normalizedReply.parentCommentId
          ? normalizedReply
          : { ...normalizedReply, parentCommentId: targetComment.id };
        setComments((prev) => [...prev, safeReply]);
      } else {
        await loadComments(currentPage);
      }
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to reply to comment:", error);
      toast.error("Could not post your reply. Please try again.");
    } finally {
      setSubmittingReplyTo(null);
    }
  };

  const handleToggleLike = async (comment: CommentFeedItem) => {
    if (!viewer) {
      toast.error("Vui lòng đăng nhập để thích bình luận.");
      redirectToSignIn();
      return;
    }

    if (likingCommentIds.has(comment.id)) return;

    const optimisticLiked = !comment.likedByViewer;
    const optimisticLikeCount = Math.max(
      0,
      comment.likeCount + (optimisticLiked ? 1 : -1),
    );

    setLikingCommentIds((prev) => new Set(prev).add(comment.id));
    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? {
              ...item,
              likedByViewer: optimisticLiked,
              likeCount: optimisticLikeCount,
            }
          : item,
      ),
    );

    try {
      const result = await toggleCommentLike(comment.id);
      if (!result.success) {
        setComments((prev) =>
          prev.map((item) =>
            item.id === comment.id
              ? {
                  ...item,
                  likedByViewer: comment.likedByViewer,
                  likeCount: comment.likeCount,
                }
              : item,
          ),
        );
        toast.error(result.message);
        if (result.requiresSignIn) redirectToSignIn();
        return;
      }

      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                likedByViewer:
                  typeof result.liked === "boolean"
                    ? result.liked
                    : item.likedByViewer,
                likeCount:
                  typeof result.likeCount === "number"
                    ? result.likeCount
                    : item.likeCount,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle comment like:", error);
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                likedByViewer: comment.likedByViewer,
                likeCount: comment.likeCount,
              }
            : item,
        ),
      );
      toast.error("Could not update like right now.");
    } finally {
      setLikingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(comment.id);
        return next;
      });
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    if (nextPage === currentPage) return;
    setExpandedThreads(new Set());
    setCollapsedReplyThreads(new Set());
    setActiveReplyId(null);
    setReplyDrafts({});
    setCurrentPage(nextPage);
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-gradient-to-b from-card via-card to-secondary/45 p-4 shadow-lg shadow-black/15 md:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <MessageSquareText className="h-5 w-5 text-primary" />
            {scopeMeta.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {scopeMeta.subtitle}
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {pagination.totalItems} Bình luận
        </Badge>
      </div>

      <div className="rounded-xl border border-primary/25 bg-background/45 p-3 md:p-4">
        <CommentComposer
          viewer={viewer}
          signInHref={signInHref}
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleSubmitRootComment}
          isSubmitting={isSubmitting}
        />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-border/70 bg-background/25 py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rootComments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/25 py-10 text-center text-sm text-muted-foreground">
            Chưa có bình luận nào
          </div>
        ) : (
          <div className="space-y-4">
            {rootComments.map((parent) => (
              <CommentThread
                key={parent.id}
                root={parent}
                commentsById={commentsById}
                childrenByParentId={childrenByParentId}
                descendantCountById={descendantCountById}
                isExpanded={expandedThreads.has(parent.id)}
                collapsedReplyThreads={collapsedReplyThreads}
                activeReplyId={activeReplyId}
                replyDrafts={replyDrafts}
                submittingReplyTo={submittingReplyTo}
                likingCommentIds={likingCommentIds}
                onToggleExpanded={(expanded) =>
                  setThreadExpanded(parent.id, expanded)
                }
                onToggleChildExpanded={setChildThreadExpanded}
                onStartReply={handleStartReply}
                onCancelReply={() => setActiveReplyId(null)}
                onReplyDraftChange={(commentId, value) =>
                  setReplyDrafts((prev) => ({ ...prev, [commentId]: value }))
                }
                onReplySubmit={handleReplySubmit}
                onLike={handleToggleLike}
              />
            ))}
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!pagination.hasPrevPage || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1">
              {visiblePages.map((pageNum) => (
                <Button
                  key={pageNum}
                  type="button"
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="icon"
                  disabled={isLoading}
                  onClick={() => handlePageChange(pageNum)}
                  aria-label={`Go to page ${pageNum}`}
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
