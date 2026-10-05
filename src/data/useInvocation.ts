import { useCallback, useEffect, useRef, useState } from "react";
import type { InvocationsApi } from "../domain/api";
import { isTerminal, type Invocation } from "../domain/types";

export type DetailState =
    | { readonly kind: "idle" }
    | { readonly kind: "loading"; readonly id: string }
    | { readonly kind: "missing"; readonly id: string }
    | { readonly kind: "error"; readonly id: string; readonly message: string }
    | { readonly kind: "loaded"; readonly invocation: Invocation };

/**
 * Loads the selected invocation. Switching selection aborts the previous request,
 * so a slow response for an invocation you already left can't replace the new one.
 * Active invocations are polled; completed ones are not.
 */
export function useInvocation(api: InvocationsApi, id: string | undefined, pollMs = 2_000): { state: DetailState; reload: () => void } {
    const [state, setState] = useState<DetailState>({ kind: "idle" });
    const [version, setVersion] = useState(0);
    const reload = useCallback(() => setVersion((v) => v + 1), []);
    const shown = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (id === undefined) {
            shown.current = undefined;
            setState({ kind: "idle" });
            return;
        }
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        if (shown.current !== id) setState({ kind: "loading", id });

        const fetchOnce = () => {
            api.get(id, controller.signal)
                .then((invocation) => {
                    if (controller.signal.aborted) return;
                    shown.current = id;
                    if (invocation === undefined) {
                        setState({ kind: "missing", id });
                        return;
                    }
                    setState({ kind: "loaded", invocation });
                    if (pollMs > 0 && !isTerminal(invocation.status)) timer = setTimeout(fetchOnce, pollMs);
                })
                .catch((reason: unknown) => {
                    if (controller.signal.aborted) return;
                    setState({ kind: "error", id, message: reason instanceof Error ? reason.message : String(reason) });
                });
        };
        fetchOnce();
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [api, id, pollMs, version]);

    return { state, reload };
}
