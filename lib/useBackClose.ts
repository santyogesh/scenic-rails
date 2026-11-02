"use client";
import { useEffect, useRef } from "react";

const pendingBack = new Map<string, ReturnType<typeof setTimeout>>();

/** While `open`, the browser/phone Back button calls `close` instead of leaving the page. */
export function useBackClose(open: boolean, close: () => void, key: string) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    // An immediate remount (React Strict Mode) keeps the entry it was about to drop.
    const pending = pendingBack.get(key);
    if (pending !== undefined) {
      clearTimeout(pending);
      pendingBack.delete(key);
    } else {
      history.pushState({ ...history.state, overlay: key }, "");
    }
    const onPop = () => closeRef.current();
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("popstate", onPop);
      // Closed from the UI: drop the entry we pushed so Back isn't a dead press.
      if (history.state?.overlay !== key) return;
      pendingBack.set(
        key,
        setTimeout(() => {
          pendingBack.delete(key);
          if (history.state?.overlay === key) history.back();
        })
      );
    };
  }, [open, key]);
}
