"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type CosmeticScrollAreaProps = Readonly<{
  children: ReactNode;
  /** Outer `relative` wrapper (e.g. sizing, `rounded-md`, `overflow-hidden`). */
  className?: string;
  style?: CSSProperties;
  /** Scrolling viewport; `no-scrollbar` and overflow are merged in. */
  viewportClassName?: string;
  viewportStyle?: CSSProperties;
  /** Minimum thumb height in px when content is long. */
  minThumbPx?: number;
}>;

/**
 * Hides native scrollbars and draws a thin primary-colored thumb (wheel / trackpad scroll only).
 */
export default function CosmeticScrollArea({
  children,
  className,
  style,
  viewportClassName,
  viewportStyle,
  minThumbPx = 28,
}: CosmeticScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({
    scrollable: false,
    top: 0,
    height: 0,
  });

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 1) {
      setThumb({ scrollable: false, top: 0, height: 0 });
      return;
    }

    const track = clientHeight;
    let heightPx = (clientHeight / scrollHeight) * track;
    heightPx = Math.max(minThumbPx, heightPx);
    heightPx = Math.min(heightPx, track);

    const travel = track - heightPx;
    const topPx = maxScroll <= 0 ? 0 : (scrollTop / maxScroll) * travel;

    setThumb({ scrollable: true, top: topPx, height: heightPx });
  }, [minThumbPx]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateThumb();

    const ro = new ResizeObserver(() => {
      updateThumb();
    });
    ro.observe(el);

    el.addEventListener("scroll", updateThumb, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateThumb);
    };
  }, [updateThumb]);

  return (
    <div className={cx("relative min-h-0 w-full", className)} style={style}>
      <div
        ref={scrollRef}
        className={cx(
          "no-scrollbar min-h-0 w-full overflow-auto",
          viewportClassName,
        )}
        style={viewportStyle}
      >
        {children}
      </div>
      {thumb.scrollable && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1"
          aria-hidden
        >
          <div
            className="absolute left-1/2 w-0.5 -translate-x-1/2 rounded-sm"
            style={{
              top: thumb.top,
              height: thumb.height,
              backgroundColor: "var(--color-primary)",
              opacity: 0.36,
            }}
          />
        </div>
      )}
    </div>
  );
}
