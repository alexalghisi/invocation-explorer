import type { InvocationSummary } from "../domain/types";
import { emptyList, listReducer, pagesFor, rowAt } from "./listState";

function row(id: string): InvocationSummary {
    return { id, service: "S", handler: "h", status: "running", createdAt: 0, modifiedAt: 0, attempts: 1 };
}

describe("listReducer", () => {
    it("stores pages and the total", () => {
        const state = listReducer(emptyList("k"), { type: "received", key: "k", page: 1, seq: 1, items: [row("a"), row("b")], total: 42 });
        expect(state.total).toBe(42);
        expect(rowAt(state, 10, 10)?.id).toBe("a");
        expect(rowAt(state, 11, 10)?.id).toBe("b");
        expect(rowAt(state, 0, 10)).toBeUndefined();
    });

    it("ignores responses for a filter that is no longer active", () => {
        const state = listReducer(emptyList("new"), { type: "received", key: "old", page: 0, seq: 9, items: [row("x")], total: 1 });
        expect(state.pages.size).toBe(0);
    });

    it("ignores an older response for a page that already has newer data", () => {
        let state = listReducer(emptyList("k"), { type: "received", key: "k", page: 0, seq: 5, items: [row("fresh")], total: 1 });
        state = listReducer(state, { type: "received", key: "k", page: 0, seq: 4, items: [row("stale")], total: 1 });
        expect(rowAt(state, 0, 10)?.id).toBe("fresh");
    });

    it("clears everything when the filter changes, and nothing when it doesn't", () => {
        const loaded = listReducer(emptyList("k"), { type: "received", key: "k", page: 0, seq: 1, items: [row("a")], total: 1 });
        expect(listReducer(loaded, { type: "reset", key: "k" })).toBe(loaded);
        expect(listReducer(loaded, { type: "reset", key: "other" })).toEqual(emptyList("other"));
    });
});

describe("pagesFor", () => {
    it("covers a row range with whole pages", () => {
        expect(pagesFor(0, 10, 10)).toEqual([0]);
        expect(pagesFor(95, 205, 100)).toEqual([0, 1, 2]);
        expect(pagesFor(5, 5, 10)).toEqual([]);
    });
});
