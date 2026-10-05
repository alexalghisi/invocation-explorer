import { expect, test, type Page } from "@playwright/test";
import { EMPTY_FILTER } from "../src/domain/filter";
import { hash } from "../src/runtime/random";
import { FakeRuntime } from "../src/runtime/FakeRuntime";

/** The demo server uses seed 7, so the same runtime here knows which invocations carry hostile payloads. */
async function hostileInvocation(): Promise<string> {
    const runtime = new FakeRuntime({ size: 100_000, seed: 7 });
    const { items } = await runtime.list({ filter: EMPTY_FILTER, offset: 0, limit: 5_000 });
    const hostile = items.find((item) => hash(item.id) % 97 === 0);
    if (!hostile) throw new Error("no hostile invocation in the first 5,000");
    return hostile.id;
}

const rows = (page: Page) => page.getByRole("listbox", { name: "Invocations" }).getByRole("option");

test.describe("invocation explorer", () => {
    test("keeps the DOM small while scrolling through 100,000 invocations", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText(/^1\d\d,\d{3} invocations$/)).toBeVisible();
        await expect(rows(page).first()).toBeVisible();
        const list = page.locator(".virtual");
        await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
        await expect(page.locator("[aria-posinset]").last()).toHaveAttribute("aria-posinset", /^1\d\d\d\d\d$/);
        expect(await page.locator(".row").count()).toBeLessThan(60);
    });

    test("opens an invocation from the keyboard and survives a reload", async ({ page, isMobile }) => {
        test.skip(isMobile, "keyboard navigation is a desktop flow");
        await page.goto("/?status=failed");
        const list = page.getByRole("listbox", { name: "Invocations" });
        await expect(rows(page).first()).toBeVisible();
        await list.focus();
        await page.keyboard.press("j");
        await page.keyboard.press("j");
        await page.keyboard.press("Enter");
        const heading = page.getByRole("complementary").getByRole("heading", { level: 2 });
        const id = await heading.textContent();
        expect(page.url()).toContain(`inv=${id}`);
        await page.reload();
        await expect(page.getByRole("complementary").getByRole("heading", { level: 2 })).toHaveText(id ?? "");
        await expect(page.getByRole("button", { name: "failed" })).toHaveAttribute("aria-pressed", "true");
    });

    test("renders hostile payloads as text", async ({ page }) => {
        let dialogs = 0;
        page.on("dialog", (dialog) => {
            dialogs += 1;
            void dialog.dismiss();
        });
        await page.goto(`/?inv=${await hostileInvocation()}`);
        const input = page.getByRole("region", { name: "Input" });
        await expect(input.getByText(/onerror=alert/)).toBeVisible();
        await expect(input.getByText(/javascript:alert/)).toBeVisible();
        await expect(page.locator(".payload img")).toHaveCount(0);
        await expect(page.locator(".payload a")).toHaveCount(0);
        expect(dialogs).toBe(0);
    });

    test("asks before cancelling and updates the status straight away", async ({ page }) => {
        await page.goto("/?status=running");
        await rows(page).first().click();
        const detail = page.getByRole("complementary", { name: "Invocation details" });
        await detail.getByRole("button", { name: "Cancel" }).click();
        const dialog = page.getByRole("alertdialog");
        await expect(dialog.getByRole("button", { name: "Keep it" })).toBeFocused();
        await dialog.getByRole("button", { name: "Cancel invocation" }).click();
        await expect(detail.locator(".badge")).toHaveText("cancelled");
        await expect(page.getByRole("status")).toContainText("Cancelled inv_");
    });
});
