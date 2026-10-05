import { ApiError, type InvocationsApi, type ListQuery } from "../domain/api";
import { matches } from "../domain/filter";
import { isTerminal, type Invocation, type InvocationStatus, type InvocationSummary, type Page } from "../domain/types";
import { ERRORS, SERVICES, STATUS_WEIGHTS, makeId, makeInput, makeJournal } from "./data";
import { pick, seeded, weighted, type Random } from "./random";

export interface FakeRuntimeOptions {
    readonly size: number;
    readonly seed?: number;
    readonly now?: () => number;
    /** Simulated network latency per request, in ms. */
    readonly latencyMs?: number;
    /** Probability that any request fails with `unavailable`. */
    readonly failureRate?: number;
}

/**
 * An in-memory stand-in for a durable execution runtime's admin API.
 * It keeps moving: `tick()` starts, retries, suspends and completes invocations,
 * so the UI is always looking at data that changes underneath it.
 */
export class FakeRuntime implements InvocationsApi {
    private items: InvocationSummary[];
    private readonly random: Random;
    private readonly failures: Random;
    private readonly now: () => number;
    private readonly latencyMs: number;
    private readonly failureRate: number;

    constructor(options: FakeRuntimeOptions) {
        this.random = seeded(options.seed ?? 1);
        this.failures = seeded((options.seed ?? 1) + 1);
        this.now = options.now ?? Date.now;
        this.latencyMs = options.latencyMs ?? 0;
        this.failureRate = options.failureRate ?? 0;
        const start = this.now();
        this.items = Array.from({ length: options.size }, (_, i) => this.create(start - i * 1_700));
    }

    get size(): number {
        return this.items.length;
    }

    async list({ filter, offset, limit }: ListQuery, signal?: AbortSignal): Promise<Page> {
        await this.io(signal);
        const matching = this.items.filter((item) => matches(item, filter));
        return { items: matching.slice(offset, offset + limit), total: matching.length };
    }

    async get(id: string, signal?: AbortSignal): Promise<Invocation | undefined> {
        await this.io(signal);
        const summary = this.find(id);
        if (summary === undefined) return undefined;
        return {
            ...summary,
            input: makeInput(id, summary.service),
            ...(summary.status === "succeeded" ? { output: { ok: true } } : {}),
            journal: makeJournal(id, summary.handler, summary.createdAt, summary.status, summary.attempts),
        };
    }

    async services(): Promise<readonly string[]> {
        return SERVICES.map((s) => s.service);
    }

    async cancel(id: string): Promise<InvocationSummary> {
        await this.io();
        const current = this.require(id);
        if (isTerminal(current.status)) throw new ApiError("conflict", `${id} has already ${current.status}`);
        return this.update(id, { status: "cancelled" });
    }

    async purge(id: string): Promise<void> {
        await this.io();
        const current = this.require(id);
        if (!isTerminal(current.status)) throw new ApiError("conflict", `${id} is still ${current.status}; cancel it first`);
        this.items = this.items.filter((item) => item.id !== id);
    }

    /** Advances the simulation: new invocations arrive and recent active ones change state. */
    tick(arrivals = 2, changes = 25): void {
        const now = this.now();
        for (let i = 0; i < arrivals; i++) this.items.unshift(this.create(now, "pending"));
        const window = Math.min(this.items.length, 3_000);
        for (let i = 0; i < changes; i++) {
            const item = this.items[Math.floor(this.random() * window)];
            if (item === undefined || isTerminal(item.status)) continue;
            const next = this.transition(item.status);
            this.update(item.id, {
                status: next,
                ...(next === "running" && item.status === "backing-off" ? { attempts: item.attempts + 1 } : {}),
                ...(next === "backing-off" ? { lastError: pick(this.random, ERRORS) } : {}),
            });
        }
    }

    private transition(status: InvocationStatus): InvocationStatus {
        switch (status) {
            case "pending":
                return "running";
            case "running":
                return weighted(this.random, [
                    ["succeeded", 6],
                    ["backing-off", 2],
                    ["suspended", 2],
                ]);
            default:
                return "running";
        }
    }

    private create(createdAt: number, status?: InvocationStatus): InvocationSummary {
        const { service, handlers } = pick(this.random, SERVICES);
        const chosen = status ?? weighted(this.random, STATUS_WEIGHTS);
        const retrying = chosen === "backing-off" || chosen === "failed";
        const attempts = retrying ? 2 + Math.floor(this.random() * 8) : 1;
        return {
            id: makeId(this.random),
            service,
            handler: pick(this.random, handlers),
            status: chosen,
            createdAt,
            modifiedAt: createdAt,
            attempts,
            ...(retrying ? { lastError: pick(this.random, ERRORS) } : {}),
        };
    }

    private find(id: string): InvocationSummary | undefined {
        return this.items.find((item) => item.id === id);
    }

    private require(id: string): InvocationSummary {
        const item = this.find(id);
        if (item === undefined) throw new ApiError("not_found", `${id} does not exist`);
        return item;
    }

    private update(id: string, patch: Partial<InvocationSummary>): InvocationSummary {
        const index = this.items.findIndex((item) => item.id === id);
        const current = this.items[index];
        if (current === undefined) throw new ApiError("not_found", `${id} does not exist`);
        const next = { ...current, ...patch, modifiedAt: Math.max(this.now(), current.modifiedAt + 1) };
        this.items[index] = next;
        return next;
    }

    private async io(signal?: AbortSignal): Promise<void> {
        if (this.latencyMs > 0) {
            const jitter = this.latencyMs * (0.5 + this.failures());
            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(resolve, jitter);
                signal?.addEventListener("abort", () => {
                    clearTimeout(timer);
                    reject(new DOMException("Aborted", "AbortError"));
                });
            });
        }
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (this.failures() < this.failureRate) throw new ApiError("unavailable", "admin API unavailable, try again");
    }
}
