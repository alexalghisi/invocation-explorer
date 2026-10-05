import { scrollToReveal, visibleWindow } from "./virtual";

describe("visibleWindow", () => {
    it("renders the visible rows plus overscan", () => {
        expect(visibleWindow(0, 300, 30, 100_000, 5)).toEqual({ start: 0, end: 16 });
        expect(visibleWindow(3_000, 300, 30, 100_000, 5)).toEqual({ start: 95, end: 116 });
    });

    it("stays bounded no matter how many rows there are", () => {
        const { start, end } = visibleWindow(29_999_000, 600, 30, 1_000_000, 10);
        expect(end - start).toBeLessThanOrEqual(42);
    });

    it("clamps at the end and handles empty lists", () => {
        expect(visibleWindow(10_000, 300, 30, 50, 5)).toEqual({ start: 44, end: 50 });
        expect(visibleWindow(0, 300, 30, 0, 5)).toEqual({ start: 0, end: 0 });
    });
});

describe("scrollToReveal", () => {
    it("scrolls only when the row is out of view", () => {
        expect(scrollToReveal(5, 0, 300, 30)).toBeUndefined();
        expect(scrollToReveal(10, 0, 300, 30)).toBe(30);
        expect(scrollToReveal(2, 300, 300, 30)).toBe(60);
    });
});
