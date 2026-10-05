import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { InvocationSummary } from "../domain/types";
import { InvocationList } from "./InvocationList";

const rows: InvocationSummary[] = Array.from({ length: 100_000 }, (_, i) => ({
    id: `inv_${i}`,
    service: "CheckoutWorkflow",
    handler: "run",
    status: "running",
    createdAt: 0,
    modifiedAt: 0,
    attempts: 1,
}));

function Harness({ onOpen }: { onOpen: (index: number) => void }) {
    const [active, setActive] = useState(0);
    return (
        <InvocationList
            total={rows.length}
            row={(i) => rows[i]}
            activeIndex={active}
            selectedId={undefined}
            now={0}
            onActiveChange={setActive}
            onOpen={onOpen}
            onWindowChange={() => {}}
            fallbackHeight={360}
        />
    );
}

describe("InvocationList", () => {
    it("renders a bounded number of rows for a large list", () => {
        render(<Harness onOpen={() => {}} />);
        expect(screen.getAllByRole("option").length).toBeLessThan(30);
        expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-setsize", "100000");
    });

    it("moves the active row with the keyboard and opens it with Enter", async () => {
        const onOpen = vi.fn();
        render(<Harness onOpen={onOpen} />);
        const list = screen.getByRole("listbox", { name: "Invocations" });
        list.focus();
        await userEvent.keyboard("{ArrowDown}jj{ArrowUp}");
        expect(list).toHaveAttribute("aria-activedescendant", "row-inv_2");
        await userEvent.keyboard("{PageDown}{Enter}");
        expect(onOpen).toHaveBeenCalledWith(12);
    });

    it("keeps the active row rendered when jumping far down", async () => {
        render(<Harness onOpen={() => {}} />);
        screen.getByRole("listbox").focus();
        await userEvent.keyboard("{End}");
        expect(screen.getByRole("listbox")).toHaveAttribute("aria-activedescendant", "row-inv_99999");
        expect(document.getElementById("row-inv_99999")).not.toBeNull();
    });
});
