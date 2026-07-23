"use client";

import { CornerDownRight, ThumbsUp } from "lucide-react";
import type { CommentFeedItem } from "@/lib/actions/comment.actions";
import { formatRelativeTime } from "@/lib/date-time";
import {
  getLevelBadgeTier,
  getLevelUsernameEffect,
} from "@/lib/level-badge-tiers";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CommentRowProps = {
  comment: CommentFeedItem;
  nested?: boolean;
  canReply: boolean;
  isLiking: boolean;
  onLike: () => void;
  onReply: () => void;
};

export function CommentRow({
  comment,
  nested = false,
  canReply,
  isLiking,
  onLike,
  onReply,
}: CommentRowProps) {
  const usernameEffect = getLevelUsernameEffect(comment.userLevel);
  const levelBadgeTier = getLevelBadgeTier(comment.userLevel);

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        nested && "rounded-lg border border-border/55 bg-background/30 p-3",
      )}
    >
      <Avatar
        className={cn(
          "mt-0.5 border border-border",
          nested ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <AvatarImage src={comment.userImage} alt={comment.userName} />
        <AvatarFallback>
          {comment.userName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold tracking-wide",
              usernameEffect.className,
            )}
            title={`${usernameEffect.name} username effect`}
          >
            {comment.userName}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-5 max-w-[8rem] rounded-full px-2 text-[10px] font-semibold",
              levelBadgeTier.className,
            )}
            title={levelBadgeTier.title}
          >
            <span className="truncate">{levelBadgeTier.title}</span>
          </Badge>
          {comment.chapterName && (
            <Badge
              variant="secondary"
              className="bg-primary/15 text-primary hover:bg-primary/15"
            >
              Chapter {comment.chapterName}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/95">
          {comment.content}
        </p>

        <div className="mt-1.5 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2 text-xs",
              comment.likedByViewer && "text-primary",
            )}
            disabled={isLiking}
            onClick={onLike}
          >
            <ThumbsUp
              className={cn(
                "h-3.5 w-3.5",
                comment.likedByViewer && "fill-current",
              )}
            />
            {comment.likeCount}
          </Button>
          {canReply ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={onReply}
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Trả lời
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
