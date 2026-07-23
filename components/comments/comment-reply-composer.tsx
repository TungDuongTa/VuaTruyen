"use client";

import { Loader2, Send } from "lucide-react";
import { COMMENT_MAX_LENGTH } from "@/lib/comment-limits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentReplyComposerProps = {
  userName: string;
  value: string;
  nested?: boolean;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function CommentReplyComposer({
  userName,
  value,
  nested = false,
  isSubmitting,
  onChange,
  onCancel,
  onSubmit,
}: CommentReplyComposerProps) {
  return (
    <div
      className={cn(
        "mt-2 rounded-lg border border-border/70 bg-background/45 p-3",
        nested ? "ml-10" : "ml-11",
      )}
    >
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`Trả lời ${userName}...`}
        rows={2}
        maxLength={COMMENT_MAX_LENGTH}
        className="resize-none border-primary/20 bg-background/70 text-sm"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {value.trim().length}/{COMMENT_MAX_LENGTH}
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={isSubmitting || !value.trim()}
            onClick={onSubmit}
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
    </div>
  );
}
