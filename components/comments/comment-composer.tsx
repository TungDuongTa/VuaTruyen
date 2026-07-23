"use client";

import Link from "next/link";
import { Loader2, LogIn, Send } from "lucide-react";
import type { CommentViewer } from "@/lib/actions/comment.actions";
import { COMMENT_MAX_LENGTH } from "@/lib/comments/limits";
import {
  getLevelBadgeTier,
  getLevelUsernameEffect,
} from "@/lib/level-badge-tiers";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getViewerInitial } from "@/components/comments/comment-utils";

type CommentComposerProps = {
  viewer: CommentViewer;
  signInHref: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function CommentComposer({
  viewer,
  signInHref,
  value,
  onChange,
  onSubmit,
  isSubmitting,
}: CommentComposerProps) {
  if (!viewer) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Vui lòng đăng nhập để để lại bình luận.
        </p>
        <Link href={signInHref}>
          <Button size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </Button>
        </Link>
      </div>
    );
  }

  const viewerUsernameEffect = getLevelUsernameEffect(viewer.level);
  const viewerLevelBadgeTier = getLevelBadgeTier(viewer.level);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={viewer.image} alt={viewer.name} />
          <AvatarFallback>{getViewerInitial(viewer)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold tracking-wide",
                viewerUsernameEffect.className,
              )}
              title={`${viewerUsernameEffect.name} username effect`}
            >
              {viewer.name}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "h-5 max-w-[8rem] rounded-full px-2 text-[10px] font-semibold",
                viewerLevelBadgeTier.className,
              )}
              title={viewerLevelBadgeTier.title}
            >
              <span className="truncate">{viewerLevelBadgeTier.title}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Hãy chia sẻ cảm nghĩ của bạn
          </p>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Viết bình luận của bạn..."
        rows={3}
        className="resize-none border-primary/20 bg-background/70 text-sm"
        maxLength={COMMENT_MAX_LENGTH}
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {value.trim().length}/{COMMENT_MAX_LENGTH}
        </span>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !value.trim()}
          className="gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Gửi
        </Button>
      </div>
    </div>
  );
}
