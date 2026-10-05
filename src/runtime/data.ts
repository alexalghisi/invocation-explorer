import type { InvocationStatus, JournalEntry, JournalKind } from "../domain/types";
import { hash, pick, seeded, weighted, type Random } from "./random";

export const SERVICES: readonly { readonly service: string; readonly handlers: readonly string[] }[] = [
    { service: "CheckoutWorkflow", handlers: ["run", "confirmPayment"] },
    { service: "InventoryService", handlers: ["reserve", "release"] },
    { service: "PaymentGateway", handlers: ["charge", "refund"] },
    { service: "EmailSender", handlers: ["send"] },
    { service: "AgentLoop", handlers: ["step", "callTool"] },
];

export const ERRORS: readonly string[] = [
    "PaymentGateway: 503 Service Unavailable",
    "TimeoutError: call to InventoryService/reserve exceeded 30s",
    "TerminalError: card declined (insufficient_funds)",
    "ECONNRESET while calling smtp.internal:587",
    "RateLimited: tool provider returned 429, retry after 12s",
];

export const STATUS_WEIGHTS: readonly (readonly [InvocationStatus, number])[] = [
    ["succeeded", 62],
    ["running", 8],
    ["suspended", 8],
    ["failed", 8],
    ["backing-off", 6],
    ["pending", 4],
    ["cancelled", 4],
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function makeId(random: Random): string {
    let id = "inv_";
    for (let i = 0; i < 12; i++) id += pick(random, [...ALPHABET]);
    return id;
}

/**
 * Payloads come from users' own services, so some of them are hostile on purpose:
 * the UI must show them as text, never as markup or clickable script.
 */
export function makeInput(id: string, service: string): unknown {
    const random = seeded(hash(id) ^ 0x9e3779b9);
    const order = { orderId: `ord_${Math.floor(random() * 1e6)}`, amount: Math.round(random() * 50_000) / 100, currency: "EUR" };
    if (hash(id) % 97 === 0) {
        return { ...order, note: "<img src=x onerror=alert('xss')>", callbackUrl: "javascript:alert(document.cookie)" };
    }
    if (service === "AgentLoop") return { goal: "Summarise open support tickets", maxSteps: 40, model: "gpt-4o-mini" };
    if (service === "EmailSender") return { to: `customer${hash(id) % 10_000}@example.com`, template: "order-confirmation", docs: "https://docs.restate.dev" };
    return order;
}

/** A journal is derived from the id, so it never has to be stored. AgentLoop steps can be thousands long. */
export function makeJournal(id: string, handler: string, createdAt: number, status: InvocationStatus, attempts: number): JournalEntry[] {
    const random = seeded(hash(id));
    const long = handler === "step" && random() < 0.3;
    const count = long ? 2_000 + Math.floor(random() * 3_000) : 3 + Math.floor(random() * 15);
    const entries: JournalEntry[] = [];
    let clock = createdAt;
    const kinds: readonly (readonly [JournalKind, number])[] = [
        ["run", 40],
        ["call", 30],
        ["state", 15],
        ["sleep", 15],
    ];
    for (let index = 0; index < count; index++) {
        const kind: JournalKind = index === 0 ? "input" : weighted(random, kinds);
        const durationMs = kind === "sleep" ? 500 + Math.floor(random() * 5_000) : Math.floor(random() * 400);
        const failing = index === count - 1 && (status === "backing-off" || status === "failed");
        const retried = !failing && kind !== "input" && random() < 0.03;
        const entry: JournalEntry = {
            index,
            kind,
            name: kind === "call" ? `${pick(random, SERVICES).service}/${kind}` : kind === "run" ? `step-${index}` : kind,
            startedAt: clock,
            durationMs,
            attempt: failing ? attempts : retried ? 2 : 1,
            ...(failing || retried ? { error: pick(random, ERRORS) } : {}),
        };
        entries.push(entry);
        clock += durationMs + Math.floor(random() * 50);
    }
    if (status === "succeeded") entries.push({ index: count, kind: "output", name: "output", startedAt: clock, durationMs: 1, attempt: 1 });
    return entries;
}
