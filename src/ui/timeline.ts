import { JOURNAL_KINDS, type JournalEntry, type JournalKind } from "../domain/types";

export interface Mark {
    readonly lane: JournalKind;
    readonly x: number;
    readonly width: number;
    /** Journal entries this mark stands for (more than one once entries outnumber pixels). */
    readonly count: number;
    readonly failed: boolean;
    readonly first: JournalEntry;
}

export interface TimelineLayout {
    readonly marks: readonly Mark[];
    readonly lanes: readonly JournalKind[];
    readonly start: number;
    readonly end: number;
    readonly aggregated: boolean;
}

/**
 * Lays journal entries out on a time axis, one lane per entry kind.
 * When there are more entries than pixels, entries that land in the same pixel
 * column of a lane are merged into one mark. Merging never hides a failure: a mark
 * that contains a failed attempt is drawn as failed, and every entry is counted.
 */
export function layoutTimeline(entries: readonly JournalEntry[], width: number): TimelineLayout {
    const lanes = JOURNAL_KINDS.filter((kind) => entries.some((entry) => entry.kind === kind));
    if (entries.length === 0 || width <= 0) return { marks: [], lanes, start: 0, end: 0, aggregated: false };

    const start = entries.reduce((min, e) => Math.min(min, e.startedAt), Infinity);
    const end = entries.reduce((max, e) => Math.max(max, e.startedAt + e.durationMs), -Infinity);
    const span = Math.max(1, end - start);
    const scale = width / span;
    const aggregated = entries.length > width;

    if (!aggregated) {
        const marks = entries.map((entry) => ({
            lane: entry.kind,
            x: (entry.startedAt - start) * scale,
            width: Math.max(1, entry.durationMs * scale),
            count: 1,
            failed: entry.error !== undefined,
            first: entry,
        }));
        return { marks, lanes, start, end, aggregated };
    }

    const buckets = new Map<string, { lane: JournalKind; from: number; to: number; count: number; failed: boolean; first: JournalEntry }>();
    for (const entry of entries) {
        const from = (entry.startedAt - start) * scale;
        const to = from + entry.durationMs * scale;
        const key = `${entry.kind}:${Math.floor(from)}`;
        const bucket = buckets.get(key);
        if (bucket === undefined) {
            buckets.set(key, { lane: entry.kind, from, to, count: 1, failed: entry.error !== undefined, first: entry });
        } else {
            bucket.to = Math.max(bucket.to, to);
            bucket.count += 1;
            bucket.failed ||= entry.error !== undefined;
        }
    }
    const marks = [...buckets.values()].map((b) => ({
        lane: b.lane,
        x: b.from,
        width: Math.max(1, b.to - b.from),
        count: b.count,
        failed: b.failed,
        first: b.first,
    }));
    return { marks, lanes, start, end, aggregated };
}
