import { useCallback, useEffect, useState } from "react";
import { fromSearchParams, toSearchParams, type ViewState } from "../domain/filter";

/**
 * Keeps the filter and the selected invocation in the URL, so a refresh, a shared
 * link or the back button lands on the same view.
 */
export function useUrlState(): [ViewState, (next: ViewState, options?: { push?: boolean }) => void] {
    const [view, setView] = useState(() => fromSearchParams(new URLSearchParams(window.location.search)));

    useEffect(() => {
        const onPop = () => setView(fromSearchParams(new URLSearchParams(window.location.search)));
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    const update = useCallback((next: ViewState, options: { push?: boolean } = {}) => {
        setView(next);
        const query = toSearchParams(next).toString();
        const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
        if (options.push) window.history.pushState(null, "", url);
        else window.history.replaceState(null, "", url);
    }, []);

    return [view, update];
}
