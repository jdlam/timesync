import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
	useMutation: () => vi.fn(),
}));

// Radix popovers call pointer-capture APIs that jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => undefined;
Element.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

const { MyEventsTable } = await import("./MyEventsTable");

function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		_id: "e1" as Id<"events">,
		title: "Design Review",
		isActive: true,
		createdAt: Date.parse("2026-01-15T00:00:00Z"),
		responseCount: 3,
		adminToken: "tok",
		...overrides,
	};
}

function renderTable() {
	render(
		<MyEventsTable events={[makeEvent()]} onViewEvent={() => undefined} />,
	);
}

describe("MyEventsTable", () => {
	afterEach(() => cleanup());

	// Mobile and desktop must render the same menu, or they drift apart again:
	// mobile previously had five unlabelled icon buttons, desktop a named menu.
	it("renders the shared actions menu on both surfaces", () => {
		renderTable();
		expect(
			screen.getAllByRole("button", { name: /actions for design review/i }),
		).toHaveLength(2);
	});

	// Two targets instead of five is what removes the 320px overflow; the
	// flex-wrap is a guard, not the fix.
	it("reduces the mobile card row to a primary action and one menu, both 44px", () => {
		renderTable();

		const viewButton = screen.getAllByRole("button", { name: /^view$/i })[0];
		const actionRow = viewButton.parentElement;

		expect(actionRow?.children.length).toBe(2);
		expect(actionRow?.className).toContain("flex-wrap");
		for (const child of Array.from(actionRow?.children ?? [])) {
			expect(child.className).toContain("min-h-[44px]");
		}
	});

	// Regression for #78/#79: the mobile card and desktop table each render
	// their own RowActionsMenu instance, and both used to be wired to one
	// shared `openPopoverId` state on this component. Opening either popover
	// opened both, one stole focus from the other, and the dismiss layer
	// closed both instantly — the menu never appeared to click. Clicking the
	// desktop trigger (the second matching button) reproduces that and fails
	// on main; RowActionsMenu is now uncontrolled so each instance manages
	// its own open state independently.
	it("opens the desktop actions menu on click", () => {
		renderTable();

		const desktopTrigger = screen.getAllByRole("button", {
			name: /actions for design review/i,
		})[1];
		fireEvent.pointerDown(desktopTrigger);
		fireEvent.click(desktopTrigger);

		expect(screen.getByText("View Details")).toBeTruthy();
	});
});
