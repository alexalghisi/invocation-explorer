import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PREVIEW_LIMIT, PayloadView, safeHref } from "./PayloadView";

describe("safeHref", () => {
    it("allows only http and https", () => {
        expect(safeHref("https://docs.restate.dev")).toBe("https://docs.restate.dev/");
        expect(safeHref("javascript:alert(1)")).toBeUndefined();
        expect(safeHref("JaVaScRiPt:alert(1)")).toBeUndefined();
        expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeUndefined();
        expect(safeHref("/relative")).toBeUndefined();
    });
});

describe("PayloadView", () => {
    it("renders hostile payloads as text, not markup or links", () => {
        const { container } = render(
            <PayloadView label="Input" value={{ note: "<img src=x onerror=alert('xss')>", callbackUrl: "javascript:alert(document.cookie)" }} />,
        );
        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("a")).toBeNull();
        expect(screen.getByText(/onerror=alert/)).toBeInTheDocument();
    });

    it("links safe URLs with noopener", () => {
        render(<PayloadView label="Input" value={{ docs: "https://docs.restate.dev" }} />);
        expect(screen.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer nofollow");
    });

    it("truncates large payloads until asked", async () => {
        render(<PayloadView label="Output" value={"x".repeat(PREVIEW_LIMIT * 3)} />);
        expect(screen.getByText(/x+…$/).textContent).toHaveLength(PREVIEW_LIMIT + 1);
        await userEvent.click(screen.getByRole("button", { name: /show all 12,000 characters/i }));
        expect(screen.getByText(/^x+$/).textContent).toHaveLength(PREVIEW_LIMIT * 3);
    });

    it("renders nothing for a missing payload", () => {
        const { container } = render(<PayloadView label="Output" value={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });
});
