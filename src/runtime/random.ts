export type Random = () => number;

/** Small seeded PRNG (mulberry32): the same seed always produces the same data. */
export function seeded(seed: number): Random {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
}

export function pick<T>(random: Random, items: readonly T[]): T {
    const item = items[Math.floor(random() * items.length)];
    if (item === undefined) throw new Error("pick() needs a non-empty list");
    return item;
}

export function weighted<T>(random: Random, options: readonly (readonly [T, number])[]): T {
    const total = options.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = random() * total;
    for (const [value, weight] of options) {
        roll -= weight;
        if (roll < 0) return value;
    }
    const last = options[options.length - 1];
    if (last === undefined) throw new Error("weighted() needs options");
    return last[0];
}
