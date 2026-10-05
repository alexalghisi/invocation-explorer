import type { RefObject } from "react";
import { STATUSES, type InvocationStatus } from "../domain/types";

interface ToolbarProps {
    readonly search: string;
    readonly statuses: readonly InvocationStatus[];
    readonly service: string;
    readonly services: readonly string[];
    readonly searchRef: RefObject<HTMLInputElement | null>;
    readonly onSearch: (search: string) => void;
    readonly onToggleStatus: (status: InvocationStatus) => void;
    readonly onService: (service: string) => void;
    readonly onSearchDone: () => void;
}

export function Toolbar({ search, statuses, service, services, searchRef, onSearch, onToggleStatus, onService, onSearchDone }: ToolbarProps) {
    return (
        <div className="toolbar">
            <input
                ref={searchRef}
                type="search"
                aria-label="Search invocations"
                placeholder="Search id, target or error   /"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape" || e.key === "ArrowDown") {
                        e.preventDefault();
                        onSearchDone();
                    }
                }}
            />
            <select aria-label="Service" value={service} onChange={(e) => onService(e.target.value)}>
                <option value="">All services</option>
                {services.map((s) => (
                    <option key={s} value={s}>
                        {s}
                    </option>
                ))}
            </select>
            <div className="chips" role="group" aria-label="Status">
                {STATUSES.map((status) => (
                    <button key={status} type="button" className={`chip chip-${status}`} aria-pressed={statuses.includes(status)} onClick={() => onToggleStatus(status)}>
                        {status}
                    </button>
                ))}
            </div>
        </div>
    );
}
