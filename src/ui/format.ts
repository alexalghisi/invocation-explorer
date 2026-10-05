const UNITS: readonly (readonly [number, string])[] = [
    [86_400_000, "d"],
    [3_600_000, "h"],
    [60_000, "m"],
    [1_000, "s"],
];

export function formatAge(timestamp: number, now: number): string {
    const elapsed = Math.max(0, now - timestamp);
    for (const [size, unit] of UNITS) if (elapsed >= size) return `${Math.floor(elapsed / size)}${unit} ago`;
    return "just now";
}

export function formatDuration(ms: number): string {
    if (ms < 1_000) return `${Math.round(ms)} ms`;
    if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
    return `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1_000)} s`;
}

export const formatCount = (n: number) => new Intl.NumberFormat("en-GB").format(n);
