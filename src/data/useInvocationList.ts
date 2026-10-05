import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { InvocationsApi } from "../domain/api";
import { filterKey } from "../domain/filter";
import type { InvocationFilter, InvocationSummary } from "../domain/types";
import { emptyList, listReducer, pagesFor, rowAt } from "./listState";

export interface Range {
    readonly start: number;
    readonly end: number;
}

export interface ListOptions {
    readonly pageSize?: number;
    readonly pollMs?: number;
}

export interface InvocationList {
    readonly total: number | undefined;
    readonly row: (index: number) => InvocationSummary | undefined;
    readonly error: string | undefined;
    readonly refresh: () => void;
}

/**
 * Loads only the pages around the visible range and re-polls them while they are
 * on screen. Pages scrolled out of view are not polled.
 */
export function useInvocationList(api: InvocationsApi, filter: InvocationFilter, range: Range, options: ListOptions = {}): InvocationList {
    const pageSize = options.pageSize ?? 100;
    const pollMs = options.pollMs ?? 2_000;
    const key = filterKey(filter);
    const [state, dispatch] = useReducer(listReducer, key, emptyList);
    const [error, setError] = useState<string>();
    const seq = useRef(0);
    const inFlight = useRef(new Set<string>());
    const latest = useRef({ filter, key, range });
    latest.current = { filter, key, range };

    const load = useCallback(
        (pages: readonly number[]) => {
            const { filter: current, key: currentKey } = latest.current;
            for (const page of pages) {
                const flightKey = `${currentKey}#${page}`;
                if (inFlight.current.has(flightKey)) continue;
                inFlight.current.add(flightKey);
                const requestSeq = ++seq.current;
                api.list({ filter: current, offset: page * pageSize, limit: pageSize })
                    .then(({ items, total }) => {
                        dispatch({ type: "received", key: currentKey, page, seq: requestSeq, items, total });
                        setError(undefined);
                    })
                    .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
                    .finally(() => inFlight.current.delete(flightKey));
            }
        },
        [api, pageSize],
    );

    useEffect(() => {
        dispatch({ type: "reset", key });
    }, [key]);

    const visiblePages = pagesFor(range.start, Math.max(range.end, range.start + 1), pageSize);
    const missing = state.key === key ? visiblePages.filter((page) => !state.pages.has(page)) : visiblePages;
    const missingKey = missing.join(",");

    useEffect(() => {
        if (missingKey !== "") load(missingKey.split(",").map(Number));
    }, [key, missingKey, load]);

    useEffect(() => {
        if (pollMs <= 0) return;
        const timer = setInterval(() => {
            const { range: current } = latest.current;
            load(pagesFor(current.start, Math.max(current.end, current.start + 1), pageSize));
        }, pollMs);
        return () => clearInterval(timer);
    }, [load, pageSize, pollMs]);

    const refresh = useCallback(() => {
        const { range: current } = latest.current;
        load(pagesFor(current.start, Math.max(current.end, current.start + 1), pageSize));
    }, [load, pageSize]);

    const current = state.key === key ? state : emptyList(key);
    const row = useCallback((index: number) => rowAt(current, index, pageSize), [current, pageSize]);
    return { total: current.total, row, error, refresh };
}
