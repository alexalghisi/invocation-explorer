import { EMPTY_FILTER, filterKey, fromSearchParams, matches, toSearchParams } from "./filter";
import type { InvocationSummary } from "./types";

const invocation: InvocationSummary = {
    id: "inv_abc123",
    service: "CheckoutWorkflow",
    handler: "run",
    status: "backing-off",
    createdAt: 0,
    modifiedAt: 0,
    attempts: 3,
    lastError: "PaymentGateway: 503 Service Unavailable",
};

describe("matches", () => {
    it("matches everything with the empty filter", () => {
        expect(matches(invocation, EMPTY_FILTER)).toBe(true);
    });

    it("filters by status and service", () => {
        expect(matches(invocation, { ...EMPTY_FILTER, statuses: ["running", "backing-off"] })).toBe(true);
        expect(matches(invocation, { ...EMPTY_FILTER, statuses: ["failed"] })).toBe(false);
        expect(matches(invocation, { ...EMPTY_FILTER, service: "EmailSender" })).toBe(false);
    });

    it("searches id, target and the last error, case-insensitively", () => {
        expect(matches(invocation, { ...EMPTY_FILTER, search: "ABC1" })).toBe(true);
        expect(matches(invocation, { ...EMPTY_FILTER, search: " 503 " })).toBe(true);
        expect(matches(invocation, { ...EMPTY_FILTER, search: "timeout" })).toBe(false);
    });
});

describe("filterKey", () => {
    it("ignores status order, search case and surrounding whitespace", () => {
        expect(filterKey({ statuses: ["failed", "running"], service: "", search: " Abc " })).toBe(
            filterKey({ statuses: ["running", "failed"], service: "", search: "abc" }),
        );
    });
});

describe("URL state", () => {
    it("round-trips the filter and the selected invocation", () => {
        const view = {
            filter: { statuses: ["running", "failed"] as const, service: "EmailSender", search: "smtp" },
            selectedId: "inv_k3j2",
        };
        const restored = fromSearchParams(new URLSearchParams(toSearchParams({ ...view, filter: { ...view.filter } }).toString()));
        expect(restored).toEqual({ ...view, filter: { ...view.filter, statuses: ["running", "failed"] } });
    });

    it("drops unknown statuses, duplicates and malformed ids", () => {
        const view = fromSearchParams(new URLSearchParams("status=running,evil,running&inv=<script>"));
        expect(view.filter.statuses).toEqual(["running"]);
        expect(view.selectedId).toBeUndefined();
    });

    it("leaves defaults out of the URL", () => {
        expect(toSearchParams({ filter: EMPTY_FILTER, selectedId: undefined }).toString()).toBe("");
    });
});
