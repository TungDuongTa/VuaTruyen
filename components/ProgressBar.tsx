"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

const MIN_VISIBLE_MS = 180;

export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const isFirstRender = useRef(true);
  const isNavigating = useRef(false);
  const startedAt = useRef(0);
  const doneTimeout = useRef<number | null>(null);

  const clearDoneTimeout = useCallback(() => {
    if (doneTimeout.current) {
      window.clearTimeout(doneTimeout.current);
      doneTimeout.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    clearDoneTimeout();

    if (isNavigating.current) {
      return;
    }

    isNavigating.current = true;
    startedAt.current = Date.now();
    NProgress.start();
  }, [clearDoneTimeout]);

  const finishProgress = useCallback(() => {
    if (!isNavigating.current) {
      return;
    }

    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    clearDoneTimeout();
    doneTimeout.current = window.setTimeout(() => {
      isNavigating.current = false;
      doneTimeout.current = null;
      NProgress.done();
    }, remaining);
  }, [clearDoneTimeout]);

  const forceDone = useCallback(() => {
    clearDoneTimeout();
    isNavigating.current = false;
    NProgress.done();
  }, [clearDoneTimeout]);

  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
    });

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:")
      ) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      startProgress();
    };

    // Browser back/forward is usually instant (cache). Starting NProgress on
    // popstate races pathname updates and can leave the bar stuck — only clear.
    const handlePopState = () => {
      forceDone();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        forceDone();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      clearDoneTimeout();
      NProgress.done();
    };
  }, [clearDoneTimeout, forceDone, startProgress]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    finishProgress();
  }, [finishProgress, pathname, queryString]);

  return null;
}
