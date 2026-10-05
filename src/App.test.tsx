import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import type { InvocationsApi } from "./domain/api";
import { EMPTY_FILTER } from "./domain/filter";
import type { InvocationSummary } from "./domain/types";
import { FakeRuntime } from "./runtime/FakeRuntime";

const NOW = Date.UTC(2026, 9, 5, 9, 0, 0);

function runtime() {
    return new FakeRuntime({ size: 300, seed: 11, now: () => NOW });
}

function renderApp(api: InvocationsApi) {
    return render(<App api={api} pollMs={0} listHeight={400} />);
}

async function first(api: InvocationsApi, status: InvocationSummary["status"]) {
    const { items } = await api.list({ filter: { ...EMPTY_FILTER, statuses: [status] }, offset: 0, limit: 1 });
    if (!items[0]) throw new Error(`no ${status} invocation`);
    return items[0];
}

beforeEach(() => window.history.replaceState(null, "", "/"));

describe("App", () => {
    it("lists invocations and opens one from the keyboard", async () => {
        const api = runtime();
        renderApp(api);
        expect(await screen.findByText("300 invocations")).toBeInTheDocument();
        const list = screen.getByRole("listbox", { name: "Invocations" });
        list.focus();
        await userEvent.keyboard("{ArrowDown}{Enter}");
        const { items } = await api.list({ filter: EMPTY_FILTER, offset: 1, limit: 1 });
        const id = items[0]?.id ?? "";
        expect(await screen.findByRole("heading", { name: id })).toBeInTheDocument();
        expect(window.location.search).toBe(`?inv=${id}`);
    });

    it("filters by status and keeps the filter in the URL", async () => {
        renderApp(runtime());
        await screen.findByText("300 invocations");
        await userEvent.click(within(screen.getByRole("group", { name: "Status" })).getByRole("button", { name: "failed" }));
        await waitFor(() => expect(screen.getByText(/^\d+ invocations$/).textContent).not.toBe("300 invocations"));
        const badges = within(screen.getByRole("listbox")).getAllByText(/^(failed|running|succeeded|pending|suspended|backing-off|cancelled)$/);
        expect(badges.every((b) => b.textContent === "failed")).toBe(true);
        expect(window.location.search).toBe("?status=failed");
    });

    it("restores the view from a deep link", async () => {
        const api = runtime();
        const target = await first(api, "running");
        window.history.replaceState(null, "", `/?status=running&inv=${target.id}`);
        renderApp(api);
        expect(await screen.findByRole("heading", { name: target.id })).toBeInTheDocument();
        expect(within(screen.getByRole("group", { name: "Status" })).getByRole("button", { name: "running" })).toHaveAttribute("aria-pressed", "true");
    });

    it("jumps to search with / and back to the list with Enter", async () => {
        renderApp(runtime());
        await screen.findByText("300 invocations");
        screen.getByRole("listbox").focus();
        await userEvent.keyboard("/");
        expect(screen.getByRole("searchbox", { name: "Search invocations" })).toHaveFocus();
        await userEvent.keyboard("CheckoutWorkflow{Enter}");
        expect(screen.getByRole("listbox")).toHaveFocus();
        await waitFor(() => expect(window.location.search).toBe("?q=CheckoutWorkflow"));
    });

    it("shows a cancel immediately and rolls it back when the server refuses", async () => {
        const fake = runtime();
        const target = await first(fake, "running");
        let refuse!: (reason: Error) => void;
        const api: InvocationsApi = {
            list: (q, s) => fake.list(q, s),
            get: (id, s) => fake.get(id, s),
            services: () => fake.services(),
            purge: (id) => fake.purge(id),
            cancel: () => new Promise((_, reject) => (refuse = reject)),
        };
        window.history.replaceState(null, "", `/?inv=${target.id}`);
        renderApp(api);
        const detail = screen.getByRole("complementary", { name: "Invocation details" });
        await userEvent.click(await within(detail).findByRole("button", { name: "Cancel" }));
        await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel invocation" }));
        expect(within(detail).getByText("cancelled")).toBeInTheDocument();
        refuse(new Error(`${target.id} has already succeeded`));
        expect(await screen.findByText(`Couldn't cancel ${target.id}: ${target.id} has already succeeded`)).toBeInTheDocument();
        expect(within(detail).getByText("running")).toBeInTheDocument();
    });

    it("purges a completed invocation after confirmation", async () => {
        const api = runtime();
        const target = await first(api, "succeeded");
        window.history.replaceState(null, "", `/?inv=${target.id}`);
        renderApp(api);
        await userEvent.click(await screen.findByRole("button", { name: "Purge" }));
        await userEvent.click(screen.getByRole("button", { name: "Purge permanently" }));
        expect(await screen.findByText(`Purged ${target.id}`)).toBeInTheDocument();
        expect(await api.get(target.id)).toBeUndefined();
        expect(window.location.search).toBe("");
    });
});
