import type { InvocationStatus, InvocationSummary } from "../domain/types";

/**
 * Optimistic changes the user just made. A pending override is shown until the
 * request settles; a confirmed one is shown until the list catches up with a row
 * that is at least as new. A failed request removes it, which rolls the row back.
 */
export interface Override {
    readonly status: InvocationStatus;
    readonly pending: boolean;
    readonly modifiedAt: number;
}

export type Overrides = ReadonlyMap<string, Override>;

export function withOverride<T extends InvocationSummary>(row: T, overrides: Overrides): T {
    const override = overrides.get(row.id);
    if (override === undefined) return row;
    if (!override.pending && row.modifiedAt >= override.modifiedAt) return row;
    return { ...row, status: override.status };
}

export function setOverride(overrides: Overrides, id: string, override: Override): Overrides {
    return new Map(overrides).set(id, override);
}

export function dropOverride(overrides: Overrides, id: string): Overrides {
    if (!overrides.has(id)) return overrides;
    const next = new Map(overrides);
    next.delete(id);
    return next;
}
