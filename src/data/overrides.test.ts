import type { InvocationSummary } from "../domain/types";
import { dropOverride, setOverride, withOverride } from "./overrides";

const row: InvocationSummary = { id: "inv_a", service: "S", handler: "h", status: "running", createdAt: 0, modifiedAt: 100, attempts: 1 };

describe("overrides", () => {
    it("shows a pending change straight away", () => {
        const overrides = setOverride(new Map(), "inv_a", { status: "cancelled", pending: true, modifiedAt: 0 });
        expect(withOverride(row, overrides).status).toBe("cancelled");
    });

    it("keeps a confirmed change until the list has data at least as new", () => {
        const overrides = setOverride(new Map(), "inv_a", { status: "cancelled", pending: false, modifiedAt: 150 });
        expect(withOverride(row, overrides).status).toBe("cancelled");
        expect(withOverride({ ...row, modifiedAt: 150, status: "cancelled" }, overrides).status).toBe("cancelled");
        expect(withOverride({ ...row, modifiedAt: 200, status: "failed" }, overrides).status).toBe("failed");
    });

    it("rolls back when the override is dropped", () => {
        const overrides = dropOverride(setOverride(new Map(), "inv_a", { status: "cancelled", pending: true, modifiedAt: 0 }), "inv_a");
        expect(withOverride(row, overrides)).toBe(row);
    });
});
