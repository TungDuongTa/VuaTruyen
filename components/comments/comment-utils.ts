"use client";

import type { CommentFeedItem, CommentViewer } from "@/lib/actions/comment.actions";

export const COMMENTS_PAGE_SIZE = 10;

export const sortNewestFirst = (a: CommentFeedItem, b: CommentFeedItem) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const sortOldestFirst = (a: CommentFeedItem, b: CommentFeedItem) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

export const normalizeComment = (comment: CommentFeedItem): CommentFeedItem => ({
  ...comment,
  id: String(comment.id),
  parentCommentId: comment.parentCommentId
    ? String(comment.parentCommentId)
    : null,
});

export const getViewerInitial = (viewer: CommentViewer) => {
  if (!viewer) return "U";
  const source = viewer.name || viewer.id || "U";
  return source.charAt(0).toUpperCase();
};

export const resolveThreadRootId = (
  comment: CommentFeedItem,
  byId: Map<string, CommentFeedItem>,
) => {
  let cursor = comment;
  const visited = new Set<string>();

  while (cursor.parentCommentId) {
    if (visited.has(cursor.parentCommentId)) break;
    visited.add(cursor.parentCommentId);

    const parent = byId.get(cursor.parentCommentId);
    if (!parent) return cursor.parentCommentId;
    if (!parent.parentCommentId) return parent.id;
    cursor = parent;
  }

  return comment.id;
};

/** Depth 0 = top-level, depth 1 = reply to top-level, etc. */
export const getCommentDepth = (
  comment: CommentFeedItem,
  byId: Map<string, CommentFeedItem>,
): number => {
  let depth = 0;
  let cursor = comment;
  const visited = new Set<string>();

  while (cursor.parentCommentId) {
    if (visited.has(cursor.parentCommentId)) break;
    visited.add(cursor.parentCommentId);
    depth += 1;
    const parent = byId.get(cursor.parentCommentId);
    if (!parent) break;
    cursor = parent;
  }

  return depth;
};
