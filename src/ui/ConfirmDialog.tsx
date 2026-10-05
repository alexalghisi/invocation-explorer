import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

interface ConfirmDialogProps {
    readonly title: string;
    readonly children: ReactNode;
    readonly confirmLabel: string;
    readonly onConfirm: () => void;
    readonly onCancel: () => void;
}

/**
 * Confirmation for actions that stop or delete real work. Focus starts on the safe
 * choice, Tab stays inside the dialog, Escape cancels, and focus goes back to
 * whatever opened it.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
    const dialog = useRef<HTMLDivElement>(null);
    const cancel = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        cancel.current?.focus();
        return () => opener?.focus();
    }, []);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
        }
        if (event.key !== "Tab") return;
        const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
        }
    };

    return (
        <div className="backdrop">
            <div ref={dialog} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={onKeyDown}>
                <h2 id="dialog-title">{title}</h2>
                <div className="dialog-body">{children}</div>
                <div className="dialog-actions">
                    <button ref={cancel} type="button" onClick={onCancel}>
                        Keep it
                    </button>
                    <button type="button" className="danger" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
