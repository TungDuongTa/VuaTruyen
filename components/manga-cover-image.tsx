"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

export const FALLBACK_MANGA_COVER =
  "https://placehold.co/300x450/111827/9CA3AF?text=No+Cover";

type MangaCoverImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  fallbackSrc?: string;
};

/** Swaps to a placeholder if the cover fails to decode (e.g. bad .bin uploads). */
export function MangaCoverImage({
  src,
  fallbackSrc = FALLBACK_MANGA_COVER,
  alt,
  sizes,
  priority,
  preload,
  loading,
  decoding,
  ...props
}: MangaCoverImageProps) {
  const normalized = String(src || "").trim() || fallbackSrc;
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const currentSrc = failedFor === normalized ? fallbackSrc : normalized;
  // Next 16 prefers `preload`; `priority` is deprecated but still used in places.
  const isPriority = Boolean(priority || preload);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      sizes={sizes ?? (props.fill ? "100vw" : undefined)}
      priority={priority}
      preload={preload}
      loading={loading ?? (isPriority ? "eager" : "lazy")}
      decoding={decoding ?? (isPriority ? "sync" : "async")}
      onError={() => {
        if (normalized !== fallbackSrc) setFailedFor(normalized);
      }}
    />
  );
}
