import { formatAge, formatCount, formatDuration } from "./format";

describe("format", () => {
    it("formats ages with the largest unit", () => {
        expect(formatAge(1_000, 1_500)).toBe("just now");
        expect(formatAge(0, 59_000)).toBe("59s ago");
        expect(formatAge(0, 2 * 3_600_000 + 5)).toBe("2h ago");
        expect(formatAge(10, 0)).toBe("just now");
    });

    it("formats durations and counts", () => {
        expect(formatDuration(412)).toBe("412 ms");
        expect(formatDuration(1_540)).toBe("1.5 s");
        expect(formatDuration(125_000)).toBe("2 m 5 s");
        expect(formatCount(100_000)).toBe("100,000");
    });
});
