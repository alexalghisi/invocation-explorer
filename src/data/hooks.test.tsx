import { act, renderHook, waitFor } from "@testing-library/react";
import type { InvocationsApi, ListQuery } from "../domain/api";
import { EMPTY_FILTER } from "../domain/filter";
import type { Invocation, Page } from "../domain/types";
import { FakeRuntime } from "../runtime/FakeRuntime";
import { useInvocation } from "./useInvocation";
import { useInvocationList } from "./useInvocationList";

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
}

describe("useInvocationList", () => {
    it("loads only the pages in the visible range", async () => {
        const runtime = new FakeRuntime({ size: 1_000, seed: 3 });
        const list = vi.spyOn(runtime, "list");
        const { result } = renderHook(() => useInvocationList(runtime, EMPTY_FILTER, { start: 120, end: 180 }, { pageSize: 50, pollMs: 0 }));
        await waitFor(() => expect(result.current.row(179)).toBeDefined());
        expect(result.current.total).toBe(1_000);
        expect(list.mock.calls.map(([q]) => q.offset).sort((a, b) => a - b)).toEqual([100, 150]);
        expect(result.current.row(0)).toBeUndefined();
    });

    it("never shows rows from a previous filter, even when they arrive last", async () => {
        const slow = deferred<Page>();
        const api = {
            list: (q: ListQuery) =>
                q.filter.search === "old" ? slow.promise : Promise.resolve({ items: [{ id: "inv_new", service: "S", handler: "h", status: "running", createdAt: 0, modifiedAt: 0, attempts: 1 }], total: 1 } as Page),
        } as unknown as InvocationsApi;
        const { result, rerender } = renderHook(({ search }) => useInvocationList(api, { ...EMPTY_FILTER, search }, { start: 0, end: 10 }, { pollMs: 0 }), {
            initialProps: { search: "old" },
        });
        rerender({ search: "new" });
        await waitFor(() => expect(result.current.row(0)?.id).toBe("inv_new"));
        await act(async () => slow.resolve({ items: [{ id: "inv_old", service: "S", handler: "h", status: "running", createdAt: 0, modifiedAt: 0, attempts: 1 }], total: 1 }));
        expect(result.current.row(0)?.id).toBe("inv_new");
    });

    it("reports errors and recovers on refresh", async () => {
        let fail = true;
        const runtime = new FakeRuntime({ size: 10, seed: 3 });
        const api = { ...runtime, list: (q: ListQuery) => (fail ? Promise.reject(new Error("admin API unavailable")) : runtime.list(q)) } as unknown as InvocationsApi;
        const { result } = renderHook(() => useInvocationList(api, EMPTY_FILTER, { start: 0, end: 10 }, { pollMs: 0 }));
        await waitFor(() => expect(result.current.error).toBe("admin API unavailable"));
        fail = false;
        act(() => result.current.refresh());
        await waitFor(() => expect(result.current.total).toBe(10));
        expect(result.current.error).toBeUndefined();
    });
});

describe("useInvocation", () => {
    it("aborts the previous request when the selection changes", async () => {
        const requests: { id: string; signal: AbortSignal | undefined; reply: ReturnType<typeof deferred<Invocation | undefined>> }[] = [];
        const api = {
            get: (id: string, signal?: AbortSignal) => {
                const reply = deferred<Invocation | undefined>();
                requests.push({ id, signal, reply });
                return reply.promise;
            },
        } as unknown as InvocationsApi;
        const { result, rerender } = renderHook(({ id }) => useInvocation(api, id, 0), { initialProps: { id: "inv_a" } });
        rerender({ id: "inv_b" });
        expect(requests[0]?.signal?.aborted).toBe(true);
        const invocation = (id: string): Invocation => ({ id, service: "S", handler: "h", status: "running", createdAt: 0, modifiedAt: 0, attempts: 1, input: {}, journal: [] });
        await act(async () => requests[1]?.reply.resolve(invocation("inv_b")));
        await act(async () => requests[0]?.reply.resolve(invocation("inv_a")));
        expect(result.current.state).toMatchObject({ kind: "loaded", invocation: { id: "inv_b" } });
    });

    it("reports invocations that no longer exist", async () => {
        const runtime = new FakeRuntime({ size: 10, seed: 3 });
        const { result } = renderHook(() => useInvocation(runtime, "inv_gone", 0));
        await waitFor(() => expect(result.current.state).toEqual({ kind: "missing", id: "inv_gone" }));
    });
});
