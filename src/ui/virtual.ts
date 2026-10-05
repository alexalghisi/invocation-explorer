export interface Window {
    readonly start: number;
    readonly end: number;
}

/** Rows to render for a scroll position: the visible ones plus `overscan` on each side. */
export function visibleWindow(scrollTop: number, viewportHeight: number, rowHeight: number, count: number, overscan: number): Window {
    if (count === 0 || rowHeight <= 0) return { start: 0, end: 0 };
    const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
    const visible = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;
    const start = Math.max(0, Math.min(first, count - 1) - overscan);
    const end = Math.min(count, first + visible + overscan);
    return { start, end };
}

/** The scrollTop that brings a row into view, or undefined if it already is. */
export function scrollToReveal(index: number, scrollTop: number, viewportHeight: number, rowHeight: number): number | undefined {
    const top = index * rowHeight;
    const bottom = top + rowHeight;
    if (top < scrollTop) return top;
    if (bottom > scrollTop + viewportHeight) return bottom - viewportHeight;
    return undefined;
}
