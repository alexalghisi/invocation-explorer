import { useEffect, useState, type RefObject } from "react";

export function useDebounced<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

export function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
}

export function useElementWidth<T extends HTMLElement>(fallback: number) {
    const [element, setElement] = useState<T | null>(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        if (!element || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(([entry]) => {
            if (entry && entry.contentRect.width > 0) setWidth(Math.floor(entry.contentRect.width));
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [element]);
    return [setElement, width] as const;
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** "/" jumps to search from anywhere except while typing. */
export function useSlashToFocus(target: RefObject<HTMLInputElement | null>) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const active = document.activeElement;
            if (event.key !== "/" || event.metaKey || event.ctrlKey || (active && TYPING.has(active.tagName))) return;
            event.preventDefault();
            target.current?.focus();
            target.current?.select();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [target]);
}
