import { useCallback, useEffect, useRef, useState } from "react";
import { dropOverride, setOverride, withOverride, type Overrides } from "./data/overrides";
import { useInvocation } from "./data/useInvocation";
import { useInvocationList } from "./data/useInvocationList";
import type { InvocationsApi } from "./domain/api";
import type { InvocationFilter, InvocationStatus } from "./domain/types";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { formatCount } from "./ui/format";
import { useDebounced, useNow, useSlashToFocus } from "./ui/hooks";
import { InvocationDetail } from "./ui/InvocationDetail";
import { InvocationList } from "./ui/InvocationList";
import { Toolbar } from "./ui/Toolbar";
import { useUrlState } from "./ui/useUrlState";
import type { Window } from "./ui/virtual";

interface AppProps {
    readonly api: InvocationsApi;
    readonly pollMs?: number;
    readonly listHeight?: number;
}

type Pending = { readonly action: "cancel" | "purge"; readonly id: string };

const message = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

export function App({ api, pollMs = 2_000, listHeight }: AppProps) {
    const [view, setView] = useUrlState();
    const [searchText, setSearchText] = useState(view.filter.search);
    const search = useDebounced(searchText, 200);
    const [range, setRange] = useState<Window>({ start: 0, end: 50 });
    const [activeIndex, setActiveIndex] = useState(0);
    const [overrides, setOverrides] = useState<Overrides>(new Map());
    const [confirm, setConfirm] = useState<Pending>();
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string>();
    const [services, setServices] = useState<readonly string[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const now = useNow(5_000);
    useSlashToFocus(searchRef);

    const filter = view.filter;
    const list = useInvocationList(api, filter, range, { pollMs });
    const detail = useInvocation(api, view.selectedId, pollMs);
    const total = list.total ?? 0;

    useEffect(() => {
        api.services().then(setServices, () => setServices([]));
    }, [api]);

    const setFilter = useCallback(
        (next: InvocationFilter) => {
            setActiveIndex(0);
            setView({ ...view, filter: next });
        },
        [setView, view],
    );

    const applySearch = useRef(setFilter);
    applySearch.current = setFilter;
    const appliedSearch = useRef(filter.search);
    useEffect(() => {
        if (search === appliedSearch.current) return;
        appliedSearch.current = search;
        applySearch.current({ ...filter, search });
    }, [search, filter]);
    useEffect(() => {
        if (filter.search === appliedSearch.current) return;
        appliedSearch.current = filter.search;
        setSearchText(filter.search);
    }, [filter.search]);

    const row = useCallback(
        (index: number) => {
            const item = list.row(index);
            return item && withOverride(item, overrides);
        },
        [list, overrides],
    );

    const open = (index: number) => {
        const item = list.row(index);
        if (item) setView({ ...view, selectedId: item.id }, { push: true });
    };

    const toggleStatus = (status: InvocationStatus) =>
        setFilter({ ...filter, statuses: filter.statuses.includes(status) ? filter.statuses.filter((s) => s !== status) : [...filter.statuses, status] });

    const runCancel = async (id: string) => {
        setOverrides((o) => setOverride(o, id, { status: "cancelled", pending: true, modifiedAt: 0 }));
        setBusy(true);
        try {
            const updated = await api.cancel(id);
            setOverrides((o) => setOverride(o, id, { status: updated.status, pending: false, modifiedAt: updated.modifiedAt }));
            setNotice(`Cancelled ${id}`);
        } catch (reason) {
            setOverrides((o) => dropOverride(o, id));
            setNotice(`Couldn't cancel ${id}: ${message(reason)}`);
        } finally {
            setBusy(false);
            list.refresh();
            detail.reload();
        }
    };

    const runPurge = async (id: string) => {
        setBusy(true);
        try {
            await api.purge(id);
            setNotice(`Purged ${id}`);
            setView({ ...view, selectedId: undefined });
        } catch (reason) {
            setNotice(`Couldn't purge ${id}: ${message(reason)}`);
        } finally {
            setBusy(false);
            list.refresh();
        }
    };

    const onConfirm = () => {
        if (!confirm) return;
        setConfirm(undefined);
        void (confirm.action === "cancel" ? runCancel(confirm.id) : runPurge(confirm.id));
    };

    return (
        <div className={`app${view.selectedId ? " has-detail" : ""}`}>
            <header className="top">
                <h1>Invocations</h1>
                <span className="count">{list.total === undefined ? "Loading…" : `${formatCount(total)} ${total === 1 ? "invocation" : "invocations"}`}</span>
            </header>
            <Toolbar
                search={searchText}
                statuses={filter.statuses}
                service={filter.service}
                services={services}
                searchRef={searchRef}
                onSearch={setSearchText}
                onToggleStatus={toggleStatus}
                onService={(service) => setFilter({ ...filter, service })}
                onSearchDone={() => listRef.current?.querySelector<HTMLElement>("[role=listbox]")?.focus()}
            />
            {list.error && (
                <div className="banner" role="alert">
                    Couldn't refresh: {list.error}. Showing the last data we had.
                    <button type="button" onClick={list.refresh}>
                        Retry now
                    </button>
                </div>
            )}
            <main className="panes">
                <div className="pane-list" ref={listRef}>
                    {list.total === 0 ? (
                        <p className="empty">No invocations match these filters.</p>
                    ) : (
                        <InvocationList
                            total={total}
                            row={row}
                            activeIndex={Math.min(activeIndex, Math.max(0, total - 1))}
                            selectedId={view.selectedId}
                            now={now}
                            onActiveChange={setActiveIndex}
                            onOpen={open}
                            onWindowChange={setRange}
                            {...(listHeight !== undefined ? { fallbackHeight: listHeight } : {})}
                        />
                    )}
                </div>
                <aside className="pane-detail" aria-label="Invocation details">
                    <InvocationDetail
                        state={detail.state}
                        status={(invocation) => withOverride(invocation, overrides).status}
                        now={now}
                        busy={busy}
                        onCancel={(id) => setConfirm({ action: "cancel", id })}
                        onPurge={(id) => setConfirm({ action: "purge", id })}
                        onClose={() => setView({ ...view, selectedId: undefined }, { push: true })}
                    />
                </aside>
            </main>
            <div className="notice" role="status">
                {notice}
            </div>
            {confirm && (
                <ConfirmDialog
                    title={confirm.action === "cancel" ? `Cancel ${confirm.id}?` : `Purge ${confirm.id}?`}
                    confirmLabel={confirm.action === "cancel" ? "Cancel invocation" : "Purge permanently"}
                    onConfirm={onConfirm}
                    onCancel={() => setConfirm(undefined)}
                >
                    {confirm.action === "cancel"
                        ? "The invocation is asked to stop. Steps that already ran are not undone unless the handler compensates for them."
                        : "The invocation and its journal are deleted. This can't be undone."}
                </ConfirmDialog>
            )}
        </div>
    );
}
