import { type KeyboardEvent } from "react";
import type { InvocationSummary } from "../domain/types";
import { formatAge } from "./format";
import { StatusBadge } from "./StatusBadge";
import type { Window } from "./virtual";
import { VirtualList } from "./VirtualList";

export const ROW_HEIGHT = 36;

interface InvocationListProps {
    readonly total: number;
    readonly row: (index: number) => InvocationSummary | undefined;
    readonly activeIndex: number;
    readonly selectedId: string | undefined;
    readonly now: number;
    readonly onActiveChange: (index: number) => void;
    readonly onOpen: (index: number) => void;
    readonly onWindowChange: (window: Window) => void;
    readonly fallbackHeight?: number;
}

const PAGE = 10;

/**
 * A listbox driven by the keyboard: arrows or j/k move, Page Up/Down jump,
 * Home/End go to the ends, Enter opens. Focus stays on the list itself and
 * aria-activedescendant points at the active row, so screen readers follow along
 * even though rows are recycled while scrolling.
 */
export function InvocationList({ total, row, activeIndex, selectedId, now, onActiveChange, onOpen, onWindowChange, fallbackHeight }: InvocationListProps) {
    const move = (index: number) => onActiveChange(Math.max(0, Math.min(total - 1, index)));

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const keys: Record<string, () => void> = {
            ArrowDown: () => move(activeIndex + 1),
            j: () => move(activeIndex + 1),
            ArrowUp: () => move(activeIndex - 1),
            k: () => move(activeIndex - 1),
            PageDown: () => move(activeIndex + PAGE),
            PageUp: () => move(activeIndex - PAGE),
            Home: () => move(0),
            End: () => move(total - 1),
            Enter: () => activeIndex >= 0 && onOpen(activeIndex),
        };
        const action = keys[event.key];
        if (!action || total === 0 || event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        action();
    };

    const activeRow = activeIndex >= 0 ? row(activeIndex) : undefined;

    return (
        <div
            className="list"
            role="listbox"
            aria-label="Invocations"
            tabIndex={0}
            aria-activedescendant={activeRow ? `row-${activeRow.id}` : undefined}
            onKeyDown={onKeyDown}
        >
            <VirtualList
                count={total}
                rowHeight={ROW_HEIGHT}
                revealIndex={activeIndex}
                onWindowChange={onWindowChange}
                {...(fallbackHeight !== undefined ? { fallbackHeight } : {})}
                renderRow={(index) => {
                    const item = row(index);
                    if (!item) {
                        return <div key={`loading-${index}`} className="row row-loading" style={{ height: ROW_HEIGHT }} aria-hidden="true" />;
                    }
                    return (
                        <div
                            key={item.id}
                            id={`row-${item.id}`}
                            role="option"
                            aria-selected={item.id === selectedId}
                            aria-setsize={total}
                            aria-posinset={index + 1}
                            className={`row${index === activeIndex ? " row-active" : ""}`}
                            style={{ height: ROW_HEIGHT }}
                            onClick={() => {
                                onActiveChange(index);
                                onOpen(index);
                            }}
                        >
                            <StatusBadge status={item.status} />
                            <span className="mono id">{item.id}</span>
                            <span className="target">
                                {item.service}/<b>{item.handler}</b>
                            </span>
                            <span className="attempts">{item.attempts > 1 ? `×${item.attempts}` : ""}</span>
                            <span className="age">{formatAge(item.createdAt, now)}</span>
                        </div>
                    );
                }}
            />
        </div>
    );
}
