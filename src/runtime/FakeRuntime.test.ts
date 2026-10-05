import { EMPTY_FILTER } from "../domain/filter";
import { ApiError } from "../domain/api";
import { FakeRuntime } from "./FakeRuntime";

const NOW = Date.UTC(2026, 9, 5, 9, 0, 0);

function runtime(size = 2_000) {
    return new FakeRuntime({ size, seed: 42, now: () => NOW });
}

async function firstWith(rt: FakeRuntime, status: "running" | "succeeded") {
    const page = await rt.list({ filter: { ...EMPTY_FILTER, statuses: [status] }, offset: 0, limit: 1 });
    const item = page.items[0];
    if (!item) throw new Error(`no ${status} invocation in the sample`);
    return item;
}

describe("FakeRuntime", () => {
    it("is deterministic for a seed", async () => {
        const a = await runtime().list({ filter: EMPTY_FILTER, offset: 0, limit: 5 });
        const b = await runtime().list({ filter: EMPTY_FILTER, offset: 0, limit: 5 });
        expect(a).toEqual(b);
    });

    it("pages through filtered results, newest first", async () => {
        const rt = runtime();
        const filter = { ...EMPTY_FILTER, statuses: ["failed" as const] };
        const first = await rt.list({ filter, offset: 0, limit: 10 });
        const second = await rt.list({ filter, offset: 10, limit: 10 });
        expect(first.total).toBeGreaterThan(20);
        expect([...first.items, ...second.items].every((i) => i.status === "failed")).toBe(true);
        const times = [...first.items, ...second.items].map((i) => i.createdAt);
        expect(times).toEqual([...times].sort((x, y) => y - x));
    });

    it("returns the same journal for an invocation every time", async () => {
        const rt = runtime();
        const { id } = await firstWith(rt, "running");
        expect((await rt.get(id))?.journal).toEqual((await rt.get(id))?.journal);
    });

    it("cancels active invocations and refuses completed ones", async () => {
        const rt = runtime();
        const running = await firstWith(rt, "running");
        const done = await firstWith(rt, "succeeded");
        const cancelled = await rt.cancel(running.id);
        expect(cancelled.status).toBe("cancelled");
        expect(cancelled.modifiedAt).toBeGreaterThan(running.modifiedAt);
        await expect(rt.cancel(done.id)).rejects.toMatchObject({ code: "conflict" });
    });

    it("purges only completed invocations", async () => {
        const rt = runtime();
        const running = await firstWith(rt, "running");
        const done = await firstWith(rt, "succeeded");
        await expect(rt.purge(running.id)).rejects.toBeInstanceOf(ApiError);
        await rt.purge(done.id);
        expect(await rt.get(done.id)).toBeUndefined();
        expect(rt.size).toBe(1_999);
    });

    it("keeps moving: tick adds arrivals at the top and changes active invocations", async () => {
        const rt = runtime();
        const before = await rt.list({ filter: EMPTY_FILTER, offset: 0, limit: 3_000 });
        rt.tick(3, 200);
        const after = await rt.list({ filter: EMPTY_FILTER, offset: 0, limit: 3_003 });
        expect(after.total).toBe(before.total + 3);
        expect(after.items.slice(0, 3).every((i) => i.status === "pending")).toBe(true);
        const pairs = after.items.slice(3).map((item, i) => [before.items[i], item] as const);
        const changed = pairs.filter(([old, now]) => old?.status !== now.status);
        expect(changed.length).toBeGreaterThan(0);
        expect(changed.every(([old, now]) => old !== undefined && now.modifiedAt > old.modifiedAt)).toBe(true);
    });

    it("fails requests at the configured rate", async () => {
        const rt = new FakeRuntime({ size: 10, seed: 1, failureRate: 1 });
        await expect(rt.list({ filter: EMPTY_FILTER, offset: 0, limit: 1 })).rejects.toMatchObject({ code: "unavailable" });
    });

    it("stops waiting when a request is aborted", async () => {
        const rt = new FakeRuntime({ size: 10, seed: 1, latencyMs: 1_000 });
        const controller = new AbortController();
        const pending = rt.list({ filter: EMPTY_FILTER, offset: 0, limit: 1 }, controller.signal);
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    });
});
