import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

function Harness({ onConfirm }: { onConfirm: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Cancel invocation</button>
            {open && (
                <ConfirmDialog title="Cancel inv_1?" confirmLabel="Cancel invocation" onConfirm={onConfirm} onCancel={() => setOpen(false)}>
                    It stops at its next journal entry.
                </ConfirmDialog>
            )}
        </>
    );
}

describe("ConfirmDialog", () => {
    it("focuses the safe choice and returns focus to the opener on Escape", async () => {
        const onConfirm = vi.fn();
        render(<Harness onConfirm={onConfirm} />);
        const opener = screen.getByRole("button", { name: "Cancel invocation" });
        await userEvent.click(opener);
        expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
        await userEvent.keyboard("{Escape}");
        expect(screen.queryByRole("alertdialog")).toBeNull();
        expect(opener).toHaveFocus();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("keeps Tab inside the dialog", async () => {
        render(<Harness onConfirm={() => {}} />);
        await userEvent.click(screen.getByRole("button", { name: "Cancel invocation" }));
        const dialog = screen.getByRole("alertdialog");
        await userEvent.tab();
        expect(dialog.querySelector(".danger")).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
        await userEvent.tab({ shift: true });
        expect(dialog.querySelector(".danger")).toHaveFocus();
    });
});
