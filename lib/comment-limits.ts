export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_MAX_DEPTH = 3;

/** Max new comments (roots + replies) per user in a short window. */
export const COMMENT_CREATE_RATE = {
  windowMs: 60_000,
  max: 5,
  label: "1 phút",
} as const;

/** Max new comments per user per hour. */
export const COMMENT_CREATE_HOURLY_RATE = {
  windowMs: 60 * 60 * 1000,
  max: 40,
  label: "1 giờ",
} as const;

/** Max like toggles per user per minute. */
export const COMMENT_LIKE_RATE = {
  windowMs: 60_000,
  max: 40,
  label: "1 phút",
} as const;
