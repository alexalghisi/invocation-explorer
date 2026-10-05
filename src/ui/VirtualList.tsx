import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import { scrollToReveal, visibleWindow, type Window } from "./virtual";

interface VirtualListProps {
    readonly count: number;
    readonly rowHeight: number;
    readonly renderRow: (index: number) => ReactNode;
    readonly onWindowChange?: (window: Window) => void;
    /** Scrolls this row into view when it changes (keyboard navigation, deep links). */
    readonly revealIndex?: number | undefined;
    readonly overscan?: number;
    /** Used until the container has been measured (and in environments without layout). */
    readonly fallbackHeight?: number;
}

/**
 * Renders only the rows in view. The DOM stays at a few dozen rows whether the
 * list holds a hundred invocations or a million.
 */
export function VirtualList({ count, rowHeight, renderRow, onWindowChange, revealIndex, overscan = 8, fallbackHeight = 600 }: VirtualListProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [height, setHeight] = useState(fallbackHeight);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () => setHeight(element.clientHeight || fallbackHeight);
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [fallbackHeight]);

    const slice = visibleWindow(scrollTop, height, rowHeight, count, overscan);

    const report = useRef(onWindowChange);
    report.current = onWindowChange;
    useEffect(() => {
        report.current?.({ start: slice.start, end: slice.end });
    }, [slice.start, slice.end]);

    useEffect(() => {
        const element = ref.current;
        if (!element || revealIndex === undefined || revealIndex < 0) return;
        const target = scrollToReveal(revealIndex, element.scrollTop, height, rowHeight);
        if (target !== undefined) {
            element.scrollTop = target;
            setScrollTop(target);
        }
    }, [revealIndex, height, rowHeight]);

    const onScroll = (event: UIEvent<HTMLDivElement>) => setScrollTop(event.currentTarget.scrollTop);

    const rows: ReactNode[] = [];
    for (let index = slice.start; index < slice.end; index++) rows.push(renderRow(index));

    return (
        <div ref={ref} className="virtual" onScroll={onScroll}>
            <div style={{ height: count * rowHeight, position: "relative" }}>
                <div style={{ transform: `translateY(${slice.start * rowHeight}px)` }}>{rows}</div>
            </div>
        </div>
    );
}
