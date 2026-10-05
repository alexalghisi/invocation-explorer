import type { JournalEntry } from "../domain/types";
import { layoutTimeline } from "./timeline";

function entry(index: number, overrides: Partial<JournalEntry> = {}): JournalEntry {
    return { index, kind: "run", name: `step-${index}`, startedAt: index * 10, durationMs: 5, attempt: 1, ...overrides };
}

describe("layoutTimeline", () => {
    it("draws one mark per entry while they fit, in lanes that exist", () => {
        const layout = layoutTimeline([entry(0, { kind: "input" }), entry(1), entry(2, { kind: "sleep", durationMs: 100 })], 600);
        expect(layout.lanes).toEqual(["input", "run", "sleep"]);
        expect(layout.marks).toHaveLength(3);
        expect(layout.aggregated).toBe(false);
        const last = layout.marks[2];
        expect(last && last.x + last.width).toBeCloseTo(600);
    });

    it("merges entries that share a pixel when there are more entries than pixels", () => {
        const entries = Array.from({ length: 10_000 }, (_, i) => entry(i));
        const layout = layoutTimeline(entries, 400);
        expect(layout.aggregated).toBe(true);
        expect(layout.marks.length).toBeLessThanOrEqual(400);
        expect(layout.marks.reduce((sum, m) => sum + m.count, 0)).toBe(10_000);
    });

    it("never hides a failed attempt inside a merged mark", () => {
        const entries = Array.from({ length: 10_000 }, (_, i) => entry(i, i === 7_321 ? { error: "503", attempt: 2 } : {}));
        const failed = layoutTimeline(entries, 400).marks.filter((m) => m.failed);
        expect(failed).toHaveLength(1);
        expect(failed[0]?.count).toBeGreaterThan(1);
    });

    it("handles an empty journal", () => {
        expect(layoutTimeline([], 400).marks).toEqual([]);
    });
});
