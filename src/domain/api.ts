import type { Invocation, InvocationFilter, InvocationSummary, Page } from "./types";

export interface ListQuery {
    readonly filter: InvocationFilter;
    readonly offset: number;
    readonly limit: number;
}

/** The UI only talks to this port, so the fake runtime and a real admin API are interchangeable. */
export interface InvocationsApi {
    list(query: ListQuery, signal?: AbortSignal): Promise<Page>;
    get(id: string, signal?: AbortSignal): Promise<Invocation | undefined>;
    services(): Promise<readonly string[]>;
    /** Asks a running invocation to stop. Fails with `conflict` once it has completed. */
    cancel(id: string): Promise<InvocationSummary>;
    /** Deletes a completed invocation and its journal. Fails with `conflict` while it is still active. */
    purge(id: string): Promise<void>;
}

export type ApiErrorCode = "conflict" | "not_found" | "unavailable";

export class ApiError extends Error {
    readonly code: ApiErrorCode;

    constructor(code: ApiErrorCode, message: string) {
        super(message);
        this.name = "ApiError";
        this.code = code;
    }
}
