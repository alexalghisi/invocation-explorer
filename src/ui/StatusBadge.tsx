import type { InvocationStatus } from "../domain/types";

export function StatusBadge({ status }: { readonly status: InvocationStatus }) {
    return <span className={`badge badge-${status}`}>{status}</span>;
}
