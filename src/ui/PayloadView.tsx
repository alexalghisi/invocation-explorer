import { useState } from "react";

export const PREVIEW_LIMIT = 4_000;

/** Only plain web links become clickable. Anything else (javascript:, data:, relative paths) stays text. */
export function safeHref(value: string): string | undefined {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
    } catch {
        return undefined;
    }
}

function stringify(value: unknown): string {
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        return String(value);
    }
}

function links(value: unknown, found: string[] = []): string[] {
    if (typeof value === "string") {
        const href = safeHref(value);
        if (href !== undefined) found.push(href);
    } else if (Array.isArray(value)) {
        value.forEach((v) => links(v, found));
    } else if (value !== null && typeof value === "object") {
        Object.values(value).forEach((v) => links(v, found));
    }
    return found;
}

/**
 * Shows a payload that came from someone else's service. It is rendered as text
 * (React escapes it), never as HTML, and long payloads are truncated until asked for.
 */
export function PayloadView({ label, value }: { readonly label: string; readonly value: unknown }) {
    const [expanded, setExpanded] = useState(false);
    const text = stringify(value);
    if (text === "") return null;
    const truncated = !expanded && text.length > PREVIEW_LIMIT;
    const hrefs = links(value);

    return (
        <section className="payload" aria-label={label}>
            <h3>{label}</h3>
            <pre>{truncated ? `${text.slice(0, PREVIEW_LIMIT)}…` : text}</pre>
            {truncated && (
                <button type="button" onClick={() => setExpanded(true)}>
                    Show all {text.length.toLocaleString("en-GB")} characters
                </button>
            )}
            {hrefs.length > 0 && (
                <ul className="links">
                    {hrefs.map((href) => (
                        <li key={href}>
                            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                                {href}
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
