import type { DetailState } from "../data/useInvocation";
import { isTerminal, type Invocation, type InvocationStatus } from "../domain/types";
import { formatAge } from "./format";
import { useElementWidth } from "./hooks";
import { PayloadView } from "./PayloadView";
import { StatusBadge } from "./StatusBadge";
import { Timeline } from "./Timeline";

interface InvocationDetailProps {
    readonly state: DetailState;
    readonly status: (invocation: Invocation) => InvocationStatus;
    readonly now: number;
    readonly busy: boolean;
    readonly onCancel: (id: string) => void;
    readonly onPurge: (id: string) => void;
    readonly onClose: () => void;
}

export function InvocationDetail({ state, status, now, busy, onCancel, onPurge, onClose }: InvocationDetailProps) {
    const [ref, width] = useElementWidth<HTMLDivElement>(520);

    if (state.kind === "idle") {
        return (
            <div className="detail empty">
                <p>Select an invocation to see its journal, payloads and actions.</p>
                <p className="hint">
                    <kbd>j</kbd>/<kbd>k</kbd> to move, <kbd>Enter</kbd> to open, <kbd>/</kbd> to search
                </p>
            </div>
        );
    }
    if (state.kind === "loading") return <div className="detail" aria-busy="true">Loading {state.id}…</div>;
    if (state.kind === "missing") return <div className="detail">{state.id} no longer exists. It may have been purged.</div>;
    if (state.kind === "error") return <div className="detail" role="alert">Couldn't load {state.id}: {state.message}</div>;

    const { invocation } = state;
    const current = status(invocation);
    const terminal = isTerminal(current);

    return (
        <div className="detail" ref={ref}>
            <header>
                <button type="button" className="back" onClick={onClose} aria-label="Close details">
                    ←
                </button>
                <h2 className="mono">{invocation.id}</h2>
                <StatusBadge status={current} />
            </header>
            <dl className="facts">
                <dt>Target</dt>
                <dd>
                    {invocation.service}/{invocation.handler}
                </dd>
                <dt>Created</dt>
                <dd>
                    <time dateTime={new Date(invocation.createdAt).toISOString()}>{formatAge(invocation.createdAt, now)}</time>
                </dd>
                <dt>Attempts</dt>
                <dd>{invocation.attempts}</dd>
                {invocation.lastError !== undefined && (
                    <>
                        <dt>Last error</dt>
                        <dd className="error">{invocation.lastError}</dd>
                    </>
                )}
            </dl>
            <div className="actions">
                <button type="button" disabled={terminal || busy} onClick={() => onCancel(invocation.id)}>
                    Cancel
                </button>
                <button type="button" className="danger" disabled={!terminal || busy} onClick={() => onPurge(invocation.id)}>
                    Purge
                </button>
            </div>
            <Timeline journal={invocation.journal} width={width} />
            <PayloadView label="Input" value={invocation.input} />
            <PayloadView label="Output" value={invocation.output} />
        </div>
    );
}
