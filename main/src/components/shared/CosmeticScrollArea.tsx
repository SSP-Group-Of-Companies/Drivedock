"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const THUMB_NARROW_PX = 2;
const THUMB_WIDE_PX = 6;
/** Hit strip width — must fit widened thumb; keep in sync with viewport `pr-*`. */
const RAIL_WIDTH_CLASS = "w-3";

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

type ThumbMetrics = Readonly<{
  scrollable: boolean;
  top: number;
  height: number;
  maxScroll: number;
  track: number;
}>;

/**
 * Hides native scrollbars, shows a thin primary thumb flush to the right edge;
 * on hover the thumb widens leftward (still anchored on the right). The rail
 * uses the default cursor; wheel over the rail still scrolls the viewport.
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
  const railRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<ThumbMetrics>({
    scrollable: false,
    top: 0,
    height: 0,
    maxScroll: 0,
    track: 0,
  });
  const grabOffsetRef = useRef(0);
  const pointerInRailRef = useRef(false);
  const draggingRef = useRef(false);

  const [thumb, setThumb] = useState({
    scrollable: false,
    top: 0,
    height: 0,
  });
  const [railHovered, setRailHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 1) {
      metricsRef.current = {
        scrollable: false,
        top: 0,
        height: 0,
        maxScroll: 0,
        track: clientHeight,
      };
      setThumb({ scrollable: false, top: 0, height: 0 });
      return;
    }

    const track = clientHeight;
    let heightPx = (clientHeight / scrollHeight) * track;
    heightPx = Math.max(minThumbPx, heightPx);
    heightPx = Math.min(heightPx, track);

    const travel = track - heightPx;
    const topPx = maxScroll <= 0 ? 0 : (scrollTop / maxScroll) * travel;

    metricsRef.current = {
      scrollable: true,
      top: topPx,
      height: heightPx,
      maxScroll,
      track,
    };
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

  const expanded = railHovered || dragging;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !thumb.scrollable) return;

    const onWheel = (e: WheelEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop += e.deltaY + (e.shiftKey ? e.deltaX : 0);
      e.preventDefault();
    };

    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, [thumb.scrollable]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const el = scrollRef.current;
      const rail = railRef.current;
      const m = metricsRef.current;
      if (!el || !rail || !m.scrollable) return;

      const rect = rail.getBoundingClientRect();
      const travel = m.track - m.height;
      if (travel <= 0) return;

      const y = e.clientY - rect.top;
      let thumbTop = y - grabOffsetRef.current;
      thumbTop = Math.max(0, Math.min(travel, thumbTop));
      el.scrollTop = (thumbTop / travel) * m.maxScroll;
    };

    const onUp = () => {
      draggingRef.current = false;
      setDragging(false);
      setRailHovered(pointerInRailRef.current);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const handleRailMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const rail = railRef.current;
      const el = scrollRef.current;
      if (!rail || !el) return;

      const m = metricsRef.current;
      if (!m.scrollable || m.maxScroll <= 0) return;

      const rect = rail.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const travel = m.track - m.height;
      if (travel <= 0) return;

      const onThumb = y >= m.top && y <= m.top + m.height;
      if (onThumb) {
        e.preventDefault();
        grabOffsetRef.current = y - m.top;
        draggingRef.current = true;
        setDragging(true);
        return;
      }

      e.preventDefault();
      let thumbTop = y - m.height / 2;
      thumbTop = Math.max(0, Math.min(travel, thumbTop));
      el.scrollTop = (thumbTop / travel) * m.maxScroll;
      updateThumb();
    },
    [updateThumb],
  );

  const handleRailMouseEnter = useCallback(() => {
    pointerInRailRef.current = true;
    setRailHovered(true);
  }, []);

  const handleRailMouseLeave = useCallback(() => {
    pointerInRailRef.current = false;
    if (!draggingRef.current) setRailHovered(false);
  }, []);

  const thumbWidthPx = expanded ? THUMB_WIDE_PX : THUMB_NARROW_PX;
  const thumbOpacity = expanded ? 0.52 : 0.36;

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
      {thumb.scrollable ? (
        <div
          ref={railRef}
          className={cx(
            "absolute inset-y-0 right-0 z-10 cursor-default",
            RAIL_WIDTH_CLASS,
          )}
          aria-hidden
          onMouseEnter={handleRailMouseEnter}
          onMouseLeave={handleRailMouseLeave}
          onMouseDown={handleRailMouseDown}
        >
          <div
            className="absolute right-0 rounded-sm transition-[width,opacity] duration-150 ease-out"
            style={{
              top: thumb.top,
              height: thumb.height,
              width: thumbWidthPx,
              backgroundColor: "var(--color-primary)",
              opacity: thumbOpacity,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
