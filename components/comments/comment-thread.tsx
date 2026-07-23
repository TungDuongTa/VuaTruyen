"use client";

import { CornerDownRight } from "lucide-react";
import type { CommentFeedItem } from "@/lib/actions/comment.actions";
import { COMMENT_MAX_DEPTH } from "@/lib/comment-limits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommentReplyComposer } from "@/components/comments/comment-reply-composer";
import { CommentRow } from "@/components/comments/comment-row";
import { getCommentDepth } from "@/components/comments/comment-utils";

type CommentThreadProps = {
  root: CommentFeedItem;
  commentsById: Map<string, CommentFeedItem>;
  childrenByParentId: Map<string, CommentFeedItem[]>;
  descendantCountById: Map<string, number>;
  isExpanded: boolean;
  collapsedReplyThreads: Set<string>;
  activeReplyId: string | null;
  replyDrafts: Record<string, string>;
  submittingReplyTo: string | null;
  likingCommentIds: Set<string>;
  onToggleExpanded: (expanded: boolean) => void;
  onToggleChildExpanded: (commentId: string, expanded: boolean) => void;
  onStartReply: (comment: CommentFeedItem) => void;
  onCancelReply: () => void;
  onReplyDraftChange: (commentId: string, value: string) => void;
  onReplySubmit: (comment: CommentFeedItem) => void;
  onLike: (comment: CommentFeedItem) => void;
};

export function CommentThread({
  root,
  commentsById,
  childrenByParentId,
  descendantCountById,
  isExpanded,
  collapsedReplyThreads,
  activeReplyId,
  replyDrafts,
  submittingReplyTo,
  likingCommentIds,
  onToggleExpanded,
  onToggleChildExpanded,
  onStartReply,
  onCancelReply,
  onReplyDraftChange,
  onReplySubmit,
  onLike,
}: CommentThreadProps) {
  const totalReplies = descendantCountById.get(root.id) || 0;
  const rootDepth = getCommentDepth(root, commentsById);

  const renderReplyComposer = (comment: CommentFeedItem, nested: boolean) => {
    if (activeReplyId !== comment.id) return null;

    return (
      <CommentReplyComposer
        userName={comment.userName}
        value={replyDrafts[comment.id] || ""}
        nested={nested}
        isSubmitting={submittingReplyTo === comment.id}
        onChange={(value) => onReplyDraftChange(comment.id, value)}
        onCancel={onCancelReply}
        onSubmit={() => onReplySubmit(comment)}
      />
    );
  };

  const renderChildren = (parentId: string, depth: number) => {
    const children = childrenByParentId.get(parentId) || [];
    if (children.length === 0) return null;

    return (
      <div className={cn("space-y-2", depth > 1 && "ml-6")}>
        {children.map((child) => {
          const childDepth = getCommentDepth(child, commentsById);
          const canReply = childDepth < COMMENT_MAX_DEPTH;
          const hasGrandchildren =
            (childrenByParentId.get(child.id) || []).length > 0;
          const grandChildCount = hasGrandchildren
            ? descendantCountById.get(child.id) ||
              (childrenByParentId.get(child.id) || []).length
            : 0;
          const isChildExpanded = !collapsedReplyThreads.has(child.id);

          return (
            <div key={child.id} className="relative">
              <span className="absolute -left-4 top-4 h-px w-4 bg-border/60" />
              <CommentRow
                comment={child}
                nested
                canReply={canReply}
                isLiking={likingCommentIds.has(child.id)}
                onLike={() => onLike(child)}
                onReply={() => onStartReply(child)}
              />
              {renderReplyComposer(child, true)}

              {hasGrandchildren && (
                <div className="ml-10 mt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:text-primary"
                    onClick={() =>
                      onToggleChildExpanded(child.id, !isChildExpanded)
                    }
                  >
                    <CornerDownRight className="mr-1 h-3.5 w-3.5" />
                    {isChildExpanded
                      ? "Ẩn bớt bình luận"
                      : `Xem thêm ${grandChildCount} bình luận `}
                  </Button>
                </div>
              )}

              {hasGrandchildren && isChildExpanded && (
                <div className="relative ml-4 mt-2 pl-4">
                  <span className="absolute bottom-0 left-0 top-0 w-px bg-border/60" />
                  {renderChildren(child.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <article className="rounded-xl border border-border/70 bg-secondary/35 p-4">
      <CommentRow
        comment={root}
        canReply={rootDepth < COMMENT_MAX_DEPTH}
        isLiking={likingCommentIds.has(root.id)}
        onLike={() => onLike(root)}
        onReply={() => onStartReply(root)}
      />
      {renderReplyComposer(root, false)}

      {totalReplies > 0 && (
        <div className="ml-11 mt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary hover:text-primary"
            onClick={() => onToggleExpanded(!isExpanded)}
          >
            <CornerDownRight className="mr-1 h-3.5 w-3.5" />
            {isExpanded
              ? "Ẩn bớt bình luận"
              : `Xem thêm ${totalReplies} bình luận`}
          </Button>
        </div>
      )}

      {isExpanded && totalReplies > 0 && (
        <div className="relative ml-11 mt-2 pl-4">
          <span className="absolute bottom-0 left-0 top-0 w-px bg-border/60" />
          {renderChildren(root.id, 1)}
        </div>
      )}
    </article>
  );
}
