import { STATUSES, type InvocationFilter, type InvocationStatus, type InvocationSummary } from "./types";

export const EMPTY_FILTER: InvocationFilter = { statuses: [], service: "", search: "" };

export function matches(invocation: InvocationSummary, filter: InvocationFilter): boolean {
    if (filter.statuses.length > 0 && !filter.statuses.includes(invocation.status)) return false;
    if (filter.service !== "" && invocation.service !== filter.service) return false;
    const needle = filter.search.trim().toLowerCase();
    if (needle === "") return true;
    return [invocation.id, invocation.service, invocation.handler, invocation.lastError ?? ""].some((field) =>
        field.toLowerCase().includes(needle),
    );
}

/** A stable key: two filters that select the same invocations produce the same key. */
export function filterKey(filter: InvocationFilter): string {
    const statuses = STATUSES.filter((s) => filter.statuses.includes(s));
    return JSON.stringify([statuses, filter.service, filter.search.trim().toLowerCase()]);
}

export interface ViewState {
    readonly filter: InvocationFilter;
    readonly selectedId: string | undefined;
}

const ID_PATTERN = /^inv_[a-z0-9]{1,40}$/;
const MAX_PARAM_LENGTH = 200;

function isStatus(value: string): value is InvocationStatus {
    return (STATUSES as readonly string[]).includes(value);
}

export function toSearchParams({ filter, selectedId }: ViewState): URLSearchParams {
    const params = new URLSearchParams();
    if (filter.search !== "") params.set("q", filter.search);
    if (filter.statuses.length > 0) params.set("status", STATUSES.filter((s) => filter.statuses.includes(s)).join(","));
    if (filter.service !== "") params.set("service", filter.service);
    if (selectedId !== undefined) params.set("inv", selectedId);
    return params;
}

/** URLs are user input: unknown statuses and malformed ids are dropped rather than trusted. */
export function fromSearchParams(params: URLSearchParams): ViewState {
    const clip = (value: string | null) => (value ?? "").slice(0, MAX_PARAM_LENGTH);
    const statuses = clip(params.get("status"))
        .split(",")
        .filter(isStatus)
        .filter((status, index, all) => all.indexOf(status) === index);
    const selected = params.get("inv");
    return {
        filter: { statuses, service: clip(params.get("service")), search: clip(params.get("q")) },
        selectedId: selected !== null && ID_PATTERN.test(selected) ? selected : undefined,
    };
}
