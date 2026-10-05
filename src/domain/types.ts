export const STATUSES = [
    "pending",
    "running",
    "backing-off",
    "suspended",
    "succeeded",
    "failed",
    "cancelled",
] as const;

export type InvocationStatus = (typeof STATUSES)[number];

export const TERMINAL: ReadonlySet<InvocationStatus> = new Set(["succeeded", "failed", "cancelled"]);

export function isTerminal(status: InvocationStatus): boolean {
    return TERMINAL.has(status);
}

export const JOURNAL_KINDS = ["input", "run", "call", "sleep", "state", "output"] as const;

export type JournalKind = (typeof JOURNAL_KINDS)[number];

export interface JournalEntry {
    readonly index: number;
    readonly kind: JournalKind;
    readonly name: string;
    readonly startedAt: number;
    readonly durationMs: number;
    readonly attempt: number;
    readonly error?: string;
}

/** What the list shows. Payloads and the journal are only loaded for the selected invocation. */
export interface InvocationSummary {
    readonly id: string;
    readonly service: string;
    readonly handler: string;
    readonly status: InvocationStatus;
    readonly createdAt: number;
    readonly modifiedAt: number;
    readonly attempts: number;
    readonly lastError?: string;
}

export interface Invocation extends InvocationSummary {
    readonly input: unknown;
    readonly output?: unknown;
    readonly journal: readonly JournalEntry[];
}

export interface InvocationFilter {
    readonly statuses: readonly InvocationStatus[];
    readonly service: string;
    readonly search: string;
}

export interface Page {
    readonly items: readonly InvocationSummary[];
    readonly total: number;
}
