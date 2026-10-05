import type { InvocationSummary } from "../domain/types";

/**
 * The list is loaded in pages, only for the rows near the viewport.
 * Every request carries the filter key and a sequence number, so a response that
 * arrives late (an older filter, or an older poll of the same page) can never
 * overwrite newer data.
 */
export interface ListState {
    readonly key: string;
    readonly total: number | undefined;
    readonly pages: ReadonlyMap<number, readonly InvocationSummary[]>;
    readonly seqs: ReadonlyMap<number, number>;
}

export type ListAction =
    | { readonly type: "reset"; readonly key: string }
    | {
          readonly type: "received";
          readonly key: string;
          readonly page: number;
          readonly seq: number;
          readonly items: readonly InvocationSummary[];
          readonly total: number;
      };

export function emptyList(key: string): ListState {
    return { key, total: undefined, pages: new Map(), seqs: new Map() };
}

export function listReducer(state: ListState, action: ListAction): ListState {
    switch (action.type) {
        case "reset":
            return action.key === state.key ? state : emptyList(action.key);
        case "received": {
            if (action.key !== state.key) return state;
            if (action.seq < (state.seqs.get(action.page) ?? -1)) return state;
            const pages = new Map(state.pages).set(action.page, action.items);
            const seqs = new Map(state.seqs).set(action.page, action.seq);
            return { ...state, total: action.total, pages, seqs };
        }
    }
}

export function pagesFor(start: number, end: number, pageSize: number): number[] {
    if (end <= start) return [];
    const first = Math.floor(start / pageSize);
    const last = Math.floor((end - 1) / pageSize);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function rowAt(state: ListState, index: number, pageSize: number): InvocationSummary | undefined {
    return state.pages.get(Math.floor(index / pageSize))?.[index % pageSize];
}
